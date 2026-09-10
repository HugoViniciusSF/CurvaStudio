import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const compilado = await build({
  stdin: {
    contents: 'export * from "./src/simulacao/fisica.ts"; export * from "./src/simulacao/gerarTrajetoria.ts"; export * from "./src/simulacao/validarModelo.ts";',
    resolveDir: raiz,
  },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
});
const fisica = await import(`data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString('base64')}`);
const { criarParticulaInicial, criarMetricas, simularFisica, gerarTrajetoria, validarModelo } = fisica;
const configuracaoBase = {
  largura: 1000, altura: 520, margem: { topo: 40, direita: 60, baixo: 60, esquerda: 60 },
  dominio: { minimo: -100, maximo: 100 }, quantidadeAmostras: 220,
  gravidade: 9.81, massa: 12, velocidadeInicial: 3,
  coeficienteAtrito: 0,
};
function cenario(calcular, alteracoes = {}, xInicial) {
  const configuracao = { ...configuracaoBase, ...alteracoes };
  const funcao = { id: 'teste', nome: 'Teste', expressao: '', descricao: '', cor: '', calcular };
  const trajetoria = gerarTrajetoria(funcao, configuracao);
  let particula = criarParticulaInicial(funcao, trajetoria, configuracao.velocidadeInicial);
  if (xInicial !== undefined) particula = { ...particula, x: xInicial, y: calcular(xInicial) };
  let energia = criarMetricas(particula, configuracao).energiaTotal;
  return {
    get particula() { return particula; },
    get energia() { return energia; },
    configuracao,
    passo(dt = 1 / 120) {
      const resultado = simularFisica({ funcao, trajetoria, configuracao, anterior: particula, tempoDecorrido: dt });
      particula = resultado.particula;
      energia = resultado.metricas.energiaTotal;
      assert.ok(Object.values(particula).every(Number.isFinite), 'estado deve permanecer finito');
      assert.equal(resultado.metricas.energiaTotal, resultado.metricas.energiaCinetica + resultado.metricas.energiaPotencial);
      return resultado;
    },
  };
}
function perto(atual, esperado, tolerancia = 1e-7) {
  assert.ok(Math.abs(atual - esperado) <= tolerancia, `${atual} deve estar a até ${tolerancia} de ${esperado}`);
}

test('energia inicial em joules inclui a massa nas parcelas cinética e potencial', () => {
  const caso = cenario(() => 5);
  perto(caso.energia, 642.6);
});

test('validar um modelo em novo domínio inclui a inclinação no estado inicial', () => {
  const modelo = { calcular: x => 1 / (x + 4.9995) };
  const antes = { ...configuracaoBase, dominio: { minimo: 0, maximo: 5 } };
  const depois = { ...antes, dominio: { minimo: -5, maximo: 5 } };
  assert.doesNotThrow(() => validarModelo(modelo, antes));
  assert.doesNotThrow(() => gerarTrajetoria(modelo, depois), 'o gráfico sozinho não detecta a indefinição da derivada');
  assert.throws(() => validarModelo(modelo, depois), /valor finito/);
});

test('validar um modelo após mudar a gravidade rejeita overflow de energia', () => {
  const modelo = { calcular: () => 1e307 };
  const antes = { ...configuracaoBase, gravidade: 0, dominio: { minimo: -5, maximo: 5 } };
  const depois = { ...antes, gravidade: 9.81 };
  assert.doesNotThrow(() => validarModelo(modelo, antes));
  assert.doesNotThrow(() => gerarTrajetoria(modelo, depois), 'uma trajetória finita pode ter energia fora da escala numérica');
  assert.throws(() => validarModelo(modelo, depois), /energia.*escala numérica/);
});

test('validação inicial rejeita valores não finitos na curva, velocidade e energias', () => {
  for (const valor of [NaN, Infinity, -Infinity]) {
    assert.throws(() => validarModelo({ calcular: () => valor }, configuracaoBase), /não está definida/);
    for (const campo of ['velocidadeInicial', 'massa', 'gravidade']) {
      assert.throws(
        () => validarModelo({ calcular: () => 1 }, { ...configuracaoBase, [campo]: valor }),
        /estado ou a energia.*escala numérica/,
        `${campo}=${valor} não deve ser aceito`,
      );
    }
  }
});
test('potencial e energia total negativos são permitidos para referência y=0', () => {
  const caso = cenario(() => -10, { velocidadeInicial: 0 });
  perto(caso.passo().metricas.energiaTotal, -1177.2);
});
test('movimento uniforme no plano sem atrito concorda com solução analítica', () => {
  const caso = cenario(() => 0, {}, 0);
  for (let i = 0; i < 240; i++) caso.passo();
  perto(caso.particula.x, 6);
  perto(caso.particula.velocidade, 3);
});
test('rampa sem atrito concorda com aceleração tangencial analítica', () => {
  const declive = -0.3;
  const caso = cenario(x => declive * x, {}, 0);
  for (let i = 0; i < 120; i++) caso.passo();
  const aceleracao = -9.81 * declive / Math.hypot(1, declive);
  perto(caso.particula.velocidade, 3 + aceleracao, 1e-7);
  perto(caso.particula.x, (3 + aceleracao / 2) / Math.hypot(1, declive), 1e-7);
});
test('energia mecânica se conserva em curva suave sem atrito', () => {
  const caso = cenario(x => 2 * Math.sin(x / 2), { velocidadeInicial: 8 }, -10);
  const inicial = caso.energia;
  let maiorDesvio = 0;
  for (let i = 0; i < 2400; i++) {
    caso.passo();
    maiorDesvio = Math.max(maiorDesvio, Math.abs(caso.energia - inicial));
  }
  assert.ok(maiorDesvio < 0.002, `desvio máximo: ${maiorDesvio} J`);
});
test('atrito no plano dissipa energia e para na distância analítica', () => {
  const caso = cenario(() => 0, { coeficienteAtrito: 0.2 }, 0);
  let anterior = caso.energia;
  let resultado;
  for (let i = 0; i < 1000; i++) {
    resultado = caso.passo();
    assert.ok(caso.energia <= anterior + 1e-8);
    anterior = caso.energia;
    if (resultado.parou) break;
  }
  assert.equal(resultado.parou, true);
  perto(caso.particula.velocidade, 0);
  perto(caso.particula.x, 3 ** 2 / (2 * 0.2 * 9.81), 1e-7);
});
test('repouso é mantido quando o atrito pode equilibrar a gravidade', () => {
  const caso = cenario(x => x / 10, { velocidadeInicial: 0, coeficienteAtrito: 0.2 }, 0);
  assert.equal(caso.passo().parou, true);
  perto(caso.particula.x, 0);
  perto(caso.particula.velocidade, 0);
});
test('partícula inverte o movimento em subida sem parar artificialmente', () => {
  const caso = cenario(x => x / 2, { velocidadeInicial: 2 }, 0);
  for (let i = 0; i < 120; i++) assert.equal(caso.passo().parou, false);
  assert.ok(caso.particula.velocidade < 0);
  perto(caso.particula.velocidade, 2 - 9.81 / Math.sqrt(5), 1e-7);
});
test('fronteiras encerram a trajetória sem ultrapassar o domínio', () => {
  const fim = cenario(() => 0, { dominio: { minimo: 0, maximo: 1 }, velocidadeInicial: 120 });
  assert.equal(fim.passo().chegou, true);
  perto(fim.particula.x, 1);
  const retorno = cenario(x => x, { dominio: { minimo: 0, maximo: 1 }, velocidadeInicial: 0 });
  assert.equal(retorno.passo().parou, true);
  perto(retorno.particula.x, 0);
});
test('intervalo zero preserva estado e intervalo inválido é rejeitado', () => {
  const caso = cenario(x => x);
  const particula = caso.particula;
  assert.equal(caso.passo(0).particula, particula);
  assert.throws(() => caso.passo(-1));
  assert.throws(() => caso.passo(Infinity));
});

test('retorno ao limite inicial conserva energia sem introduzir colisão', () => {
  const caso = cenario(x => x / 2, {
    dominio: { minimo: 0, maximo: 5 }, velocidadeInicial: 2, coeficienteAtrito: 0,
  });
  const energiaInicial = caso.energia;
  let resultado;
  for (let i = 0; i < 1000; i++) {
    resultado = caso.passo();
    if (resultado.parou) break;
  }
  assert.equal(resultado.parou, true);
  assert.equal(resultado.chegou, false);
  perto(caso.particula.x, 0);
  perto(caso.particula.velocidade, -2, 1e-7);
  perto(caso.energia, energiaInicial, 1e-7);
});

test('overflow é rejeitado na derivada, nas energias e no próprio passo de integração', () => {
  const funcao = { calcular: () => 1e308 };
  assert.throws(() => fisica.calcularDerivada(funcao, 0, { minimo: 0, maximo: 1 }), /inclinação.*escala numérica/);
  const caso = cenario(() => 0, {}, 0);
  assert.throws(() => criarMetricas({ ...caso.particula, y: 1e308 }, caso.configuracao), /energia.*escala numérica/);
  assert.throws(() => criarMetricas({ ...caso.particula, velocidade: 1e308 }, caso.configuracao), /energia.*escala numérica/);
  const extremo = cenario(x => 2 * x, {
    dominio: { minimo: 0, maximo: 1 }, gravidade: 1e308, massa: 1,
  });
  const anterior = extremo.particula;
  assert.throws(() => extremo.passo(), /integração.*escala numérica/);
  assert.equal(extremo.particula, anterior, 'um passo inválido não deve substituir o último estado válido');
});

test('grandezas conhecidas usam altura assinada e velocidade tangencial em unidades SI', () => {
  for (const altura of [-3, 3]) {
    for (const velocidade of [-4, 4]) {
      const caso = cenario(() => altura, { massa: 2, gravidade: 10, velocidadeInicial: velocidade });
      const metricas = criarMetricas(caso.particula, caso.configuracao);
      perto(metricas.altura, altura);
      perto(metricas.velocidade, velocidade);
      perto(metricas.energiaCinetica, 16);
      perto(metricas.energiaPotencial, altura === 3 ? 60 : -60);
      perto(metricas.energiaTotal, altura === 3 ? 76 : -44);
    }
  }
});

test('massa escala as energias, enquanto a gravidade altera somente o potencial de um mesmo estado', () => {
  for (const massa of [0.5, 2, 12]) {
    for (const gravidade of [1.62, 9.81, 10]) {
      const caso = cenario(() => 3, { massa, gravidade, velocidadeInicial: 4 });
      const metricas = criarMetricas(caso.particula, caso.configuracao);
      perto(metricas.energiaCinetica, massa * 8);
      perto(metricas.energiaPotencial, massa * gravidade * 3);
      perto(metricas.energiaTotal, massa * (8 + gravidade * 3));
    }
  }
});

// Oráculo independente do integrador: conservação de energia e quadratura
// de dt/dx = sqrt(1 + f'(x)^2) / sqrt(v0^2 + 2g(y0 - f(x))).
function integrarSimpson(integrando, minimo, maximo, quantidade = 20000) {
  const passo = (maximo - minimo) / quantidade;
  let soma = integrando(minimo) + integrando(maximo);
  for (let indice = 1; indice < quantidade; indice++) {
    soma += (indice % 2 === 0 ? 2 : 4) * integrando(minimo + indice * passo);
  }
  return soma * passo / 3;
}

const modelosAltaVelocidade = [
  { nome: 'seno', altura: x => 1.2 * Math.sin(1.25 * x), derivada: x => 1.5 * Math.cos(1.25 * x) },
  { nome: 'vale parabólico', altura: x => 0.18 * x ** 2 - 2.4, derivada: x => 0.36 * x },
  { nome: 'pico parabólico', altura: x => -0.22 * x ** 2 + 3, derivada: x => -0.44 * x },
  { nome: 'cúbica', altura: x => 0.035 * x ** 3 - 0.42 * x, derivada: x => 0.105 * x ** 2 - 0.42 },
  { nome: 'cosseno com rampa', altura: x => 0.85 * Math.cos(1.4 * x) + 0.12 * x, derivada: x => -1.19 * Math.sin(1.4 * x) + 0.12 },
];

for (const modelo of modelosAltaVelocidade) {
  test(`1000 m/s: ${modelo.nome} conserva energia e chega no instante físico correto`, () => {
    const minimo = -5;
    const maximo = 5;
    const velocidadeInicial = 1000;
    const gravidade = 9.81;
    const caso = cenario(modelo.altura, {
      dominio: { minimo, maximo }, velocidadeInicial, gravidade, coeficienteAtrito: 0,
    });
    const energiaInicial = caso.energia;
    const velocidadeEsperada = x => Math.sqrt(velocidadeInicial ** 2 +
      2 * gravidade * (modelo.altura(minimo) - modelo.altura(x)));
    const tempoEsperado = integrarSimpson(
      x => Math.hypot(1, modelo.derivada(x)) / velocidadeEsperada(x), minimo, maximo,
    );
    let tempo = 0;
    let resultado;
    for (let indice = 0; indice < 120; indice++) {
      resultado = caso.passo();
      tempo += resultado.tempoIntegrado;
      assert.ok(Math.abs(caso.energia - energiaInicial) < 0.001,
        `erro de energia em ${modelo.nome}: ${caso.energia - energiaInicial} J`);
      if (resultado.chegou || resultado.parou) break;
    }
    assert.equal(resultado.chegou, true);
    perto(caso.particula.x, maximo);
    perto(caso.particula.velocidade, velocidadeEsperada(maximo), 1e-7);
    perto(tempo, tempoEsperado, 2e-8);
  });
}

test('inversão e retorno à fronteira no mesmo passo dissipam a energia correta', () => {
  const velocidadeInicial = 0.01;
  const atrito = 0.2;
  const gravidade = 9.81;
  const caso = cenario(x => x, {
    dominio: { minimo: 0, maximo: 5 }, velocidadeInicial, coeficienteAtrito: atrito, gravidade,
  });
  const desaceleracaoSubida = gravidade * (1 + atrito) / Math.SQRT2;
  const aceleracaoDescida = gravidade * (1 - atrito) / Math.SQRT2;
  const tempoSubida = velocidadeInicial / desaceleracaoSubida;
  const distanciaSubida = velocidadeInicial ** 2 / (2 * desaceleracaoSubida);
  const tempoDescida = Math.sqrt(2 * distanciaSubida / aceleracaoDescida);
  const velocidadeFinal = -velocidadeInicial * Math.sqrt((1 - atrito) / (1 + atrito));
  const resultado = caso.passo();
  assert.equal(resultado.parou, true);
  assert.equal(resultado.chegou, false);
  perto(caso.particula.x, 0);
  perto(caso.particula.velocidade, velocidadeFinal, 1e-9);
  perto(caso.energia, 0.5 * caso.configuracao.massa * velocidadeFinal ** 2, 1e-10);
  perto(resultado.tempoIntegrado, tempoSubida + tempoDescida, 1e-9);
});

test('velocidade nula exatamente no ápice não encerra movimento quando a gravidade provoca retorno', () => {
  const velocidadeInicial = 2;
  const gravidade = 9.81;
  const aceleracao = gravidade / Math.SQRT2;
  const tempoSubida = velocidadeInicial / aceleracao;
  const caso = cenario(x => x, {
    dominio: { minimo: 0, maximo: 5 }, velocidadeInicial, gravidade, coeficienteAtrito: 0,
  });
  const resultado = caso.passo(tempoSubida);
  assert.equal(resultado.parou, false);
  assert.equal(resultado.chegou, false);
  perto(resultado.tempoIntegrado, tempoSubida, 1e-9);
  perto(caso.particula.velocidade, 0, 1e-9);
  perto(caso.particula.y, velocidadeInicial ** 2 / (2 * gravidade), 1e-9);
  assert.equal(caso.passo().parou, false);
  assert.ok(caso.particula.velocidade < 0);
});

test('chegada anterior à inversão é detectada mesmo quando o passo longo terminaria após o retorno', () => {
  const velocidadeInicial = 2;
  const gravidade = 9.81;
  const limite = 0.1;
  const velocidadeFinal = Math.sqrt(velocidadeInicial ** 2 - 2 * gravidade * limite);
  const tempoChegada = (velocidadeInicial - velocidadeFinal) / (gravidade / Math.SQRT2);
  const caso = cenario(x => x, {
    dominio: { minimo: 0, maximo: limite }, velocidadeInicial, gravidade, coeficienteAtrito: 0,
  });
  const resultado = caso.passo(1);
  assert.equal(resultado.chegou, true);
  assert.equal(resultado.parou, false);
  perto(caso.particula.x, limite);
  perto(caso.particula.velocidade, velocidadeFinal, 1e-8);
  perto(resultado.tempoIntegrado, tempoChegada, 1e-9);
});

test('parada pelo atrito retorna o tempo físico do repouso sem completar artificialmente o passo', () => {
  const velocidadeInicial = 3;
  const atrito = 0.2;
  const gravidade = 9.81;
  const tempoParada = velocidadeInicial / (atrito * gravidade);
  const caso = cenario(() => 0, {
    dominio: { minimo: 0, maximo: 100 }, velocidadeInicial, coeficienteAtrito: atrito, gravidade,
  });
  const resultado = caso.passo(3);
  assert.equal(resultado.parou, true);
  assert.equal(resultado.chegou, false);
  perto(resultado.tempoIntegrado, tempoParada, 1e-8);
  perto(caso.particula.x, velocidadeInicial ** 2 / (2 * atrito * gravidade), 1e-8);
  perto(caso.particula.velocidade, 0, 1e-9);
  perto(caso.energia, 0, 1e-10);
});
