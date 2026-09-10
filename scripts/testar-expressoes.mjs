import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Usa o compilador já presente no projeto, sem gravar artefatos nem acrescentar dependências.
async function modulo(nome, substituicoes = {}) {
  const source = await readFile(new URL(`../src/simulacao/${nome}.ts`, import.meta.url), "utf8");
  let codigo = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const [origem, destino] of Object.entries(substituicoes)) {
    codigo = codigo.replaceAll(`"${origem}"`, JSON.stringify(destino));
  }
  return `data:text/javascript;base64,${Buffer.from(codigo).toString("base64")}`;
}

const { criarFuncaoPorExpressao, tentarCriarFuncao, validarNoDominio } = await import(await modulo("avaliadorFuncao"));
const { gerarTrajetoria } = await import(await modulo("gerarTrajetoria", {
  "./transformacaoCoordenadas": await modulo("transformacaoCoordenadas"),
}));

function proximo(expressao, x, esperado) {
  const resultado = criarFuncaoPorExpressao(expressao)(x);
  assert.ok(Math.abs(resultado - esperado) <= 1e-12 * Math.max(1, Math.abs(esperado)), `${expressao}: ${resultado} ≠ ${esperado}`);
}

test("potências seguem a precedência matemática e associam à direita", () => {
  for (const [expressao, esperado] of [
    ["-2^2", -4], ["(-2)^2", 4], ["2^-2", 0.25], ["2^3^2", 512],
    ["-2**2", -4], ["-2^-2", -0.25], ["2^-2^2", 0.0625], ["1--2", 3],
  ]) proximo(expressao, 0, esperado);
});

test("seno e potências de funções, parênteses aninhados e sobrescritos", () => {
  proximo("-sin(x)^2", Math.PI / 2, -1);
  proximo("((x+1)*(x-1))²", 2, 9);
  proximo("sin(x)²", Math.PI / 2, 1);
  proximo("x⁻²", 2, 0.25);
  proximo("x¹²", 2, 4096);
});

test("pow, min e max preservam todos os argumentos separados por vírgula", () => {
  proximo("pow(2,3)", 0, 8);
  proximo("pow(x,2)", 3, 9);
  proximo("max(1,2,3)", 0, 3);
  proximo("min(1,2,3)", 0, 1);
  proximo("pow(pow(2,3),2)", 0, 64);
  proximo("pow(1.5,2)", 0, 2.25);
});

test("decimais brasileiros fora das funções e notação científica", () => {
  proximo("0,5*x", 4, 2);
  proximo("(1,5 + x) * 2", 1, 5);
  proximo("1e-3*x + .5", 1000, 1.5);
  proximo("1,5e2", 0, 150);
  assert.match(tentarCriarFuncao("sin(1,5)").erro, /argumento/);
});

test("constantes, aliases e operadores de escrita matemática", () => {
  proximo(" f(x) = 2 × sen(π/2) − 6 ÷ 3", 0, 0);
  proximo("ln(e)+log(E)+log10(100)", 0, 4);
  proximo("abs(-2) + sqrt(9) + exp(0) + cos(PI)", 0, 5);
  proximo("tan(0)+asin(0)+acos(1)+atan(0)+floor(1.8)+ceil(1.2)+round(1.6)", 0, 5);
});

test("expressões incompletas, funções com aridade errada e multiplicação implícita são rejeitadas", () => {
  for (const expressao of ["", "x+", "(x", "x)", "pow(2)", "pow(2,3,4)", "sin()", "max()", "sin x", "2x", "2(3)", "x,2", "x^^2"]) {
    assert.equal(tentarCriarFuncao(expressao).calcular, null, expressao);
  }
});

test("somente a gramática matemática é aceita", () => {
  for (const expressao of ["Math.sin(x)", "constructor(x)", "globalThis", "x=1", "[1,2]", "x;2", "x||2", "x?1:2", "alert(1)", "x/*1*/"]) {
    assert.equal(tentarCriarFuncao(expressao).calcular, null, expressao);
  }
});

test("números fora da escala e complexidade excessiva são rejeitados", () => {
  assert.equal(tentarCriarFuncao("1e999").calcular, null);
  assert.equal(tentarCriarFuncao("-".repeat(600) + "1").calcular, null);
  assert.equal(tentarCriarFuncao("1".repeat(2001)).calcular, null);
});

test("indefinições intermediárias não são convertidas em números válidos", () => {
  for (const expressao of ["1/(1/0)", "0*(1/0)", "sqrt(-1)^0", "exp(1000)^0", "1/0", "log(-1)"]) {
    assert.throws(() => criarFuncaoPorExpressao(expressao)(0), /x = 0/, expressao);
  }
  assert.throws(() => criarFuncaoPorExpressao("x")(Infinity), /finito/);
});

test("validação sintática não exige que a função exista em x=0", () => {
  const resultado = tentarCriarFuncao("log(x)");
  assert.equal(resultado.erro, "");
  assert.equal(resultado.calcular(1), 0);
  assert.equal(tentarCriarFuncao("log(x)", { minimo: 1, maximo: 10 }).erro, "");
  assert.equal(tentarCriarFuncao("1/x", { minimo: 1, maximo: 2 }).erro, "");
});

test("o domínio verifica endpoints e interior, reportando a coordenada inválida", () => {
  assert.match(tentarCriarFuncao("sqrt(x)", { minimo: -1, maximo: 1 }).erro, /x = -1/);
  assert.match(tentarCriarFuncao("1/(x-1)", { minimo: 0, maximo: 2 }, 5).erro, /x = 1/);
  assert.match(tentarCriarFuncao("sqrt(1-x)", { minimo: 0, maximo: 2 }, 3).erro, /x = 2/);
  assert.throws(() => validarNoDominio(() => NaN, 0, 1), /x = 0/);
  const amostras = [];
  validarNoDominio((x) => { amostras.push(x); return x; }, 0.1, 0.3, 7);
  assert.equal(amostras.at(-1), 0.3);
});

const configuracao = {
  largura: 900, altura: 500,
  margem: { topo: 20, direita: 20, baixo: 20, esquerda: 20 },
  dominio: { minimo: -1, maximo: 1 }, quantidadeAmostras: 101,
};
const funcao = (calcular) => ({ id: "teste", nome: "Teste", expressao: "x", descricao: "", cor: "#000", calcular });

test("trajetoria preserva pontos e coordenadas reais em curvas válidas", () => {
  const trajetoria = gerarTrajetoria(funcao((x) => x * x), configuracao);
  assert.equal(trajetoria.pontos.length, 101);
  assert.equal(trajetoria.inicio.x, -1);
  assert.equal(trajetoria.chegada.x, 1);
  assert.equal(trajetoria.pontos[50].y, 0);
  assert.ok(trajetoria.pontos.every((ponto) => Number.isFinite(ponto.telaX) && Number.isFinite(ponto.telaY)));
  assert.ok(trajetoria.caminho.startsWith("M "));
  assert.ok(!/NaN|Infinity/.test(trajetoria.caminho));
});

test("trajetoria não substitui indefinições por altura zero", () => {
  assert.throws(() => gerarTrajetoria(funcao((x) => 1 / x), configuracao), /x = 0/);
  assert.throws(() => gerarTrajetoria(funcao(() => NaN), configuracao), /não está definida/);
  assert.throws(() => gerarTrajetoria(funcao(() => { throw new Error("inválido"); }), configuracao), /não está definida/);
  assert.throws(() => gerarTrajetoria(funcao((x) => x * 1e308), configuracao), /escala numérica/);
});

test("domínio e número de amostras inválidos geram erros descritivos", () => {
  for (const dominio of [{ minimo: 0, maximo: 0 }, { minimo: 1, maximo: -1 }, { minimo: -Infinity, maximo: 1 }]) {
    assert.throws(() => validarNoDominio((x) => x, dominio.minimo, dominio.maximo), /domínio/);
    assert.throws(() => gerarTrajetoria(funcao((x) => x), { ...configuracao, dominio }), /domínio/);
  }
  for (const quantidadeAmostras of [0, 1, 2.5, Infinity]) {
    assert.throws(() => validarNoDominio((x) => x, -1, 1, quantidadeAmostras), /amostras/);
    assert.throws(() => gerarTrajetoria(funcao((x) => x), { ...configuracao, quantidadeAmostras }), /amostras/);
  }
});
