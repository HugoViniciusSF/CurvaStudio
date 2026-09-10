import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

// Harness determinístico: testa o ciclo e RAF sem navegador ou dependências de teste.
const reactSimulado = `
export const contexto = { slots: [], indice: 0, efeitos: [], alterado: false };
const mudou = (a, b) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
export function useState(inicial) {
  const i = contexto.indice++;
  if (!contexto.slots[i]) contexto.slots[i] = { valor: typeof inicial === 'function' ? inicial() : inicial };
  const slot = contexto.slots[i];
  return [slot.valor, (entrada) => {
    const valor = typeof entrada === 'function' ? entrada(slot.valor) : entrada;
    if (!Object.is(slot.valor, valor)) { slot.valor = valor; contexto.alterado = true; }
  }];
}
export function useRef(valor) {
  const i = contexto.indice++;
  if (!contexto.slots[i]) contexto.slots[i] = { current: valor };
  return contexto.slots[i];
}
export function useCallback(callback, deps) {
  const i = contexto.indice++;
  if (!contexto.slots[i] || mudou(contexto.slots[i].deps, deps)) contexto.slots[i] = { callback, deps };
  return contexto.slots[i].callback;
}
export function useEffect(callback, deps) {
  const i = contexto.indice++;
  const anterior = contexto.slots[i];
  if (!anterior || mudou(anterior.deps, deps)) {
    const slot = { deps, limpeza: undefined };
    contexto.slots[i] = slot;
    contexto.efeitos.push(() => { anterior?.limpeza?.(); slot.limpeza = callback(); });
  }
}
`;
const compilado = await build({
  stdin: {
    contents: 'export * from "./src/ganchos/useSimulacao.ts"; export * from "./src/simulacao/gerarTrajetoria.ts"; export { contexto } from "react";',
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{
    name: 'react-simulado', setup(build) {
      build.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'simulado' }));
      build.onLoad({ filter: /.*/, namespace: 'simulado' }, () => ({ contents: reactSimulado }));
    },
  }],
});
const {
  useSimulacao, gerarTrajetoria, contexto, PASSO_SIMULACAO,
  INTERVALOS_AMOSTRAGEM, INTERVALO_AMOSTRAGEM_PADRAO,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString('base64')}`,
);
function montar(alteracoes = {}, calcular = () => 0, intervaloAmostragem) {
  contexto.slots.forEach(slot => slot.limpeza?.());
  contexto.slots = [];
  let proximoId = 0;
  const quadros = new Map();
  const eventos = new Map();
  globalThis.requestAnimationFrame = callback => { quadros.set(++proximoId, callback); return proximoId; };
  globalThis.cancelAnimationFrame = id => { quadros.delete(id); };
  globalThis.document = {
    hidden: false,
    addEventListener: (nome, callback) => eventos.set(nome, callback),
    removeEventListener: (nome, callback) => { if (eventos.get(nome) === callback) eventos.delete(nome); },
  };
  const configuracao = {
    largura: 1000, altura: 520, margem: { topo: 40, direita: 60, baixo: 60, esquerda: 60 },
    dominio: { minimo: 0, maximo: 1000 }, quantidadeAmostras: 220,
    gravidade: 9.81, massa: 12, velocidadeInicial: 3,
    coeficienteAtrito: 0,
    ...alteracoes,
  };
  const funcao = { id: 'plano', nome: 'Plano', expressao: '0', descricao: '', cor: '', calcular };
  const props = [funcao, gerarTrajetoria(funcao, configuracao), configuracao, 1, intervaloAmostragem];
  let atual;
  function renderizar() {
    let tentativas = 0;
    do {
      assert.ok(++tentativas < 25, 'renderização deve estabilizar');
      contexto.indice = 0;
      contexto.efeitos = [];
      contexto.alterado = false;
      atual = useSimulacao(...props);
      contexto.efeitos.forEach(efeito => efeito());
    } while (contexto.alterado);
  }
  renderizar();
  return {
    props,
    get atual() { return atual; },
    chamar(nome) { atual[nome](); renderizar(); },
    quadro(tempo) {
      const callbacks = [...quadros.values()];
      quadros.clear();
      callbacks.forEach(callback => callback(tempo));
      renderizar();
    },
    segundo(hz = 60, quantidade = 1) {
      this.chamar('iniciar');
      this.quadro(0);
      for (let i = 1; i <= hz * quantidade; i++) this.quadro(i * 1000 / hz);
    },
    taxa(taxa) { props[3] = taxa; renderizar(); },
    intervalo(intervalo) { props[4] = intervalo; renderizar(); },
    configurar(nova) { props[2] = { ...props[2], ...nova }; props[1] = gerarTrajetoria(props[0], props[2]); renderizar(); },
    visibilidade(oculta) { document.hidden = oculta; eventos.get('visibilitychange')?.(); },
  };
}
function perto(a, b, tolerancia = 1e-9) { assert.ok(Math.abs(a - b) < tolerancia, `${a} ≈ ${b}`); }

test('passo fixo independe da taxa de quadros (30, 60 e 144 Hz)', () => {
  for (const hz of [30, 60, 144]) {
    const simulacao = montar();
    simulacao.segundo(hz);
    perto(simulacao.atual.tempo, 1);
    perto(simulacao.atual.particula.x, 3);
    assert.equal(simulacao.atual.historico.length, 21);
  }
});
test('escala temporal controla tempo simulado sem alterar a física', () => {
  for (const taxa of [0.25, 0.5, 1, 2]) {
    const simulacao = montar();
    simulacao.taxa(taxa);
    simulacao.segundo();
    perto(simulacao.atual.tempo, taxa);
    perto(simulacao.atual.particula.x, 3 * taxa);
  }
});
test('ritmos ampliados até 30 vezes avançam o tempo mantendo a velocidade física', () => {
  for (const ritmo of [3, 10, 30]) {
    const simulacao = montar();
    simulacao.taxa(ritmo);
    simulacao.segundo();
    perto(simulacao.atual.tempo, ritmo);
    perto(simulacao.atual.particula.x, 3 * ritmo);
    perto(simulacao.atual.metricas.velocidade, 3);
    perto(simulacao.atual.metricas.energiaTotal, 54);
    perto(simulacao.atual.historico.at(-1).tempo, ritmo);
  }
});
test('intervalos registram os instantes escolhidos em qualquer taxa de quadros e escala temporal', () => {
  assert.deepEqual(INTERVALOS_AMOSTRAGEM, [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2]);
  assert.equal(INTERVALO_AMOSTRAGEM_PADRAO, 0.05);
  for (const intervalo of INTERVALOS_AMOSTRAGEM) {
    for (const hz of [30, 60, 144]) {
      for (const taxa of [0.25, 0.5, 1, 2]) {
        const simulacao = montar({}, () => 0, intervalo);
        simulacao.taxa(taxa);
        simulacao.segundo(hz, 4);
        perto(simulacao.atual.tempo, 4 * taxa);
        perto(simulacao.atual.particula.x, 12 * taxa);
        perto(simulacao.atual.particula.velocidade, 3);
        assert.equal(simulacao.atual.historico.length, Math.floor(4 * taxa / intervalo) + 1);
        simulacao.atual.historico.forEach((amostra, indice) => {
          perto(amostra.tempo, indice * intervalo);
          perto(amostra.x, 3 * amostra.tempo);
          perto(amostra.energiaTotal, 54);
        });
      }
    }
  }
});
test('intervalo pequeno não acumula desvio de tempo em uma execução longa', () => {
  const simulacao = montar({}, () => 0, 0.025);
  simulacao.segundo(144, 60);
  perto(simulacao.atual.tempo, 60);
  assert.equal(simulacao.atual.historico.length, 2401);
  simulacao.atual.historico.forEach((amostra, indice) => perto(amostra.tempo, indice * 0.025));
});
test('mudar intervalo durante execução reamostra o histórico e o CSV sem alterar a física', () => {
  const simulacao = montar();
  simulacao.segundo();
  simulacao.quadro(1100);
  const antes = simulacao.atual;
  const csv = antes.exportarCSV();
  simulacao.intervalo(0.25);
  assert.equal(simulacao.atual.estado, 'EM_EXECUCAO');
  assert.equal(simulacao.atual.tempo, antes.tempo);
  assert.equal(simulacao.atual.particula, antes.particula);
  assert.equal(simulacao.atual.metricas, antes.metricas);
  assert.deepEqual(simulacao.atual.historico.map(amostra => amostra.tempo), [0, 0.25, 0.5, 0.75, 1]);
  assert.notEqual(simulacao.atual.exportarCSV(), csv);
  assert.deepEqual(simulacao.atual.exportarCSV().trim().split('\n').slice(1).map(linha => Number(linha.split(',')[0])), [0, 0.25, 0.5, 0.75, 1]);
  const reamostrado = simulacao.atual.historico;
  simulacao.quadro(1200);
  perto(simulacao.atual.tempo, 1.2);
  assert.deepEqual(simulacao.atual.historico, reamostrado);
  simulacao.quadro(1300);
  assert.deepEqual(simulacao.atual.historico.map(amostra => amostra.tempo), [0, 0.25, 0.5, 0.75, 1, 1.25]);
  simulacao.quadro(1350);
  assert.equal(simulacao.atual.historico.length, reamostrado.length + 1);
  perto(simulacao.atual.historico.at(-1).tempo, 1.25);
  simulacao.quadro(1600);
  perto(simulacao.atual.historico.at(-1).tempo, 1.5);
  simulacao.atual.historico.forEach(amostra => perto(amostra.x, 3 * amostra.tempo));
  assert.deepEqual(simulacao.atual.historico.slice(0, reamostrado.length), reamostrado);
});
test('mudar intervalo pausado recupera estados já calculados sem avançar a simulação', () => {
  const simulacao = montar({}, () => 0, 0.5);
  simulacao.segundo();
  simulacao.quadro(1100);
  simulacao.chamar('pausar');
  const antes = simulacao.atual;
  const csv = antes.exportarCSV();
  simulacao.intervalo(0.025);
  simulacao.quadro(5000);
  assert.equal(simulacao.atual.estado, 'PAUSADO');
  assert.equal(simulacao.atual.tempo, antes.tempo);
  assert.equal(simulacao.atual.particula, antes.particula);
  assert.equal(simulacao.atual.metricas, antes.metricas);
  assert.equal(simulacao.atual.historico.length, 45);
  simulacao.atual.historico.forEach((amostra, indice) => {
    perto(amostra.tempo, indice * 0.025);
    perto(amostra.x, 3 * amostra.tempo);
  });
  assert.notEqual(simulacao.atual.exportarCSV(), csv);
  assert.equal(simulacao.atual.exportarCSV().trim().split('\n').length, 46);
  const reamostrado = simulacao.atual.historico;
  simulacao.chamar('iniciar');
  simulacao.quadro(6000);
  simulacao.quadro(6010);
  assert.deepEqual(simulacao.atual.historico, reamostrado);
  simulacao.quadro(6025);
  assert.equal(simulacao.atual.historico.length, reamostrado.length + 1);
  perto(simulacao.atual.historico.at(-1).tempo, 1.125);
  simulacao.quadro(6050);
  perto(simulacao.atual.historico.at(-1).tempo, 1.15);
  assert.deepEqual(simulacao.atual.historico.slice(0, reamostrado.length), reamostrado);
});
test('ensaio concluído pode ser reamostrado e recupera exatamente os dados de cada intervalo', () => {
  const configuracao = {
    dominio: { minimo: -5, maximo: 5 }, velocidadeInicial: 8.6, coeficienteAtrito: 0.035,
  };
  const calcular = x => 1.2 * Math.sin(1.25 * x);
  const referencia = montar(configuracao, calcular, 0.025);
  referencia.segundo(60, 4);
  assert.equal(referencia.atual.estado, 'LIMITE_FINAL');
  const esperado = referencia.atual.historico;
  const csvEsperado = referencia.atual.exportarCSV();
  const particulaEsperada = referencia.atual.particula;
  const tempoEsperado = referencia.atual.tempo;

  const simulacao = montar(configuracao, calcular, 0.05);
  simulacao.segundo(60, 4);
  const antes = simulacao.atual;
  const csvOriginal = antes.exportarCSV();
  assert.equal(antes.estado, 'LIMITE_FINAL');
  assert.equal(antes.historico.length, 36);
  assert.deepEqual(antes.particula, particulaEsperada);
  assert.equal(antes.tempo, tempoEsperado);

  simulacao.intervalo(0.025);
  assert.equal(simulacao.atual.estado, antes.estado);
  assert.equal(simulacao.atual.tempo, antes.tempo);
  assert.equal(simulacao.atual.particula, antes.particula);
  assert.equal(simulacao.atual.metricas, antes.metricas);
  assert.equal(simulacao.atual.historico.length, 70);
  assert.deepEqual(simulacao.atual.historico, esperado);
  assert.equal(simulacao.atual.exportarCSV(), csvEsperado);

  simulacao.intervalo(0.05);
  assert.deepEqual(simulacao.atual.historico, antes.historico);
  assert.equal(simulacao.atual.exportarCSV(), csvOriginal);
  assert.equal(simulacao.atual.particula, antes.particula);
  assert.equal(simulacao.atual.tempo, antes.tempo);
  assert.equal(simulacao.atual.estado, antes.estado);
});
test('18 amostras em 0,05 s tornam-se 34 em 0,025 s preservando os extremos do mesmo ensaio', () => {
  const simulacao = montar({ dominio: { minimo: 0, maximo: 98 }, velocidadeInicial: 120 }, () => 0, 0.05);
  simulacao.segundo();
  assert.equal(simulacao.atual.estado, 'LIMITE_FINAL');
  perto(simulacao.atual.tempo, 98 / 120);
  assert.equal(simulacao.atual.historico.length, 18);
  const inicial = simulacao.atual.historico[0];
  const final = simulacao.atual.historico.at(-1);

  simulacao.intervalo(0.025);
  assert.equal(simulacao.atual.historico.length, 34);
  assert.deepEqual(simulacao.atual.historico[0], inicial);
  assert.deepEqual(simulacao.atual.historico.at(-1), final);
  simulacao.atual.historico.slice(0, -1).forEach((amostra, indice) => perto(amostra.tempo, indice * 0.025));
  assert.equal(simulacao.atual.exportarCSV().trim().split('\n').length, 35);
});
test('reamostragem atualiza os instantes mesmo quando a quantidade de amostras não muda', () => {
  const simulacao = montar({ dominio: { minimo: 0, maximo: 36 }, velocidadeInicial: 120 }, () => 0, 0.1);
  simulacao.chamar('iniciar');
  simulacao.quadro(0);
  simulacao.quadro(11 * 1000 / 120);
  simulacao.chamar('passo');
  perto(simulacao.atual.tempo, 0.1);
  simulacao.chamar('iniciar');
  simulacao.quadro(1000);
  simulacao.quadro(1250);
  assert.equal(simulacao.atual.estado, 'LIMITE_FINAL');
  assert.deepEqual(simulacao.atual.historico.map(amostra => amostra.tempo), [0, 0.1, 0.2, 0.3]);
  const original = simulacao.atual.historico;
  const csvOriginal = simulacao.atual.exportarCSV();

  simulacao.intervalo(0.25);
  assert.equal(simulacao.atual.historico.length, original.length);
  assert.deepEqual(simulacao.atual.historico.map(amostra => amostra.tempo), [0, 0.1, 0.25, 0.3]);
  assert.notDeepEqual(simulacao.atual.historico, original);
  assert.notEqual(simulacao.atual.exportarCSV(), csvOriginal);
  assert.deepEqual(simulacao.atual.exportarCSV().trim().split('\n').slice(1).map(linha => Number(linha.split(',')[0])), [0, 0.1, 0.25, 0.3]);
  simulacao.intervalo(0.1);
  assert.deepEqual(simulacao.atual.historico, original);
  assert.equal(simulacao.atual.exportarCSV(), csvOriginal);
});
test('reamostragem preserva passos manuais sem repetir estados idênticos', () => {
  const simulacao = montar({}, () => 0, 0.05);
  simulacao.chamar('iniciar');
  simulacao.quadro(0);
  simulacao.quadro(11 * 1000 / 120);
  simulacao.chamar('passo');
  perto(simulacao.atual.tempo, 0.1);
  const manuais = simulacao.atual.historico.filter(amostra => amostra.tempo === 0.1);
  assert.equal(manuais.length, 1);
  const particula = simulacao.atual.particula;

  simulacao.intervalo(2);
  assert.deepEqual(simulacao.atual.historico.map(amostra => amostra.tempo), [0, 0.1]);
  assert.deepEqual(simulacao.atual.historico.slice(-1), manuais);
  simulacao.intervalo(0.025);
  assert.deepEqual(simulacao.atual.historico.map(amostra => amostra.tempo), [0, 0.025, 0.05, 0.075, 0.1]);
  assert.deepEqual(simulacao.atual.historico.slice(-1), manuais);
  assert.equal(simulacao.atual.particula, particula);
  assert.equal(simulacao.atual.estado, 'PAUSADO');
  perto(simulacao.atual.tempo, 0.1);
});
test('reinício preserva o intervalo selecionado e agenda a primeira amostra a partir de zero', () => {
  const simulacao = montar();
  simulacao.segundo();
  simulacao.intervalo(0.5);
  simulacao.quadro(1100);
  simulacao.chamar('reiniciar');
  assert.equal(simulacao.atual.estado, 'PRONTO');
  assert.deepEqual(simulacao.atual.historico.map(amostra => amostra.tempo), [0]);
  simulacao.segundo();
  assert.deepEqual(simulacao.atual.historico.map(amostra => amostra.tempo), [0, 0.5, 1]);
  simulacao.configurar({ velocidadeInicial: 4 });
  simulacao.segundo();
  assert.deepEqual(simulacao.atual.historico.map(amostra => amostra.tempo), [0, 0.5, 1]);
});
test('intervalos inválidos usam o padrão sem comprometer a integração ou reiniciar', () => {
  for (const intervalo of [undefined, null, 0, -1, NaN, Infinity, -Infinity, 0.03, 0.075, '0.1']) {
    const simulacao = montar({}, () => 0, intervalo);
    simulacao.segundo();
    perto(simulacao.atual.tempo, 1);
    assert.equal(simulacao.atual.historico.length, 21);
    simulacao.atual.historico.forEach((amostra, indice) => perto(amostra.tempo, indice * 0.05));
  }
  const simulacao = montar({}, () => 0, 2);
  simulacao.segundo();
  const antes = simulacao.atual;
  simulacao.intervalo(NaN);
  assert.equal(simulacao.atual.particula, antes.particula);
  assert.equal(simulacao.atual.estado, antes.estado);
  assert.equal(simulacao.atual.tempo, antes.tempo);
  assert.equal(simulacao.atual.historico.length, 21);
  simulacao.atual.historico.forEach((amostra, indice) => perto(amostra.tempo, indice * 0.05));
  simulacao.quadro(1050);
  assert.equal(simulacao.atual.historico.length, 22);
  perto(simulacao.atual.historico.at(-1).tempo, 1.05);
});
test('pausa congela o estado e continuação preserva velocidade e histórico', () => {
  const simulacao = montar();
  simulacao.segundo();
  simulacao.chamar('pausar');
  const anterior = simulacao.atual.particula;
  simulacao.quadro(5000);
  assert.equal(simulacao.atual.estado, 'PAUSADO');
  assert.equal(simulacao.atual.particula, anterior);
  perto(simulacao.atual.tempo, 1);
  simulacao.chamar('iniciar');
  simulacao.quadro(5100);
  simulacao.quadro(5100 + 1000 / 60);
  perto(simulacao.atual.tempo, 1 + 1 / 60);
  perto(simulacao.atual.particula.velocidade, 3);
});
test('avanço manual faz um passo e permanece pausado', () => {
  const simulacao = montar();
  simulacao.chamar('passo');
  assert.equal(simulacao.atual.estado, 'PAUSADO');
  perto(simulacao.atual.tempo, PASSO_SIMULACAO);
  perto(simulacao.atual.particula.x, 3 * PASSO_SIMULACAO);
  assert.equal(simulacao.atual.historico.length, 2);
});
test('passos manuais registram extras sem deslocar ou duplicar a cadência regular', () => {
  const simulacao = montar({}, () => 0, 0.025);
  simulacao.chamar('passo');
  simulacao.chamar('passo');
  simulacao.chamar('passo');
  assert.deepEqual(simulacao.atual.historico.map(amostra => amostra.tempo), [0, 1 / 120, 2 / 120, 0.025]);
  simulacao.chamar('iniciar');
  simulacao.quadro(0);
  simulacao.quadro(25);
  assert.equal(simulacao.atual.historico.length, 5);
  perto(simulacao.atual.historico.at(-1).tempo, 0.05);
});
test('amostra final é registrada fora da cadência e não é duplicada quando coincide com ela', () => {
  for (const maximo of [1, 3]) {
    const simulacao = montar({ dominio: { minimo: 0, maximo }, velocidadeInicial: 120 }, () => 0, 0.025);
    simulacao.chamar('iniciar');
    simulacao.quadro(0);
    simulacao.quadro(100);
    assert.equal(simulacao.atual.estado, 'LIMITE_FINAL');
    assert.equal(simulacao.atual.historico.length, 2);
    perto(simulacao.atual.historico.at(-1).tempo, maximo / 120);
    perto(simulacao.atual.historico.at(-1).x, maximo);
  }
});
test('CSV contém unidades, amostras e valores numéricos consistentes', () => {
  const simulacao = montar();
  simulacao.segundo();
  const linhas = simulacao.atual.exportarCSV().trim().split('\n');
  assert.equal(linhas.length, simulacao.atual.historico.length + 1);
  assert.equal(linhas[0], 'tempo_s,x_m,velocidade_m_s,altura_m,energia_cinetica_J,energia_potencial_J,energia_total_J');
  assert.deepEqual(linhas.at(-1).split(',').map(Number), [1, 3, 3, 0, 54, 0, 54]);
});
test('as cinco grandezas e o CSV correspondem à solução analítica no instante informado', () => {
  const massa = 3.2;
  const gravidade = 9.81;
  const coeficienteAtrito = 0.2;
  const velocidadeInicial = 6;
  const inclinacao = -0.75;
  const fatorArco = Math.hypot(1, inclinacao);
  const aceleracao = -gravidade * (inclinacao + coeficienteAtrito) / fatorArco;
  const simulacao = montar({ massa, gravidade, coeficienteAtrito, velocidadeInicial }, x => 4 + inclinacao * x, 0.025);
  function conferir(tempo, dados) {
    const velocidade = velocidadeInicial + aceleracao * tempo;
    const x = (velocidadeInicial * tempo + 0.5 * aceleracao * tempo ** 2) / fatorArco;
    const altura = 4 + inclinacao * x;
    const energiaCinetica = 0.5 * massa * velocidade ** 2;
    const energiaPotencial = massa * gravidade * altura;
    for (const [campo, esperado] of Object.entries({ velocidade, altura, energiaCinetica, energiaPotencial, energiaTotal: energiaCinetica + energiaPotencial })) {
      perto(dados[campo], esperado, 1e-7);
    }
    if ('x' in dados) perto(dados.x, x, 1e-8);
  }
  simulacao.segundo();
  simulacao.chamar('pausar');
  conferir(simulacao.atual.tempo, simulacao.atual.metricas);
  assert.ok(simulacao.atual.metricas.altura < 0);
  assert.ok(simulacao.atual.metricas.energiaPotencial < 0);
  for (const intervalo of [0.025, 0.05, 0.25]) {
    simulacao.intervalo(intervalo);
    simulacao.atual.historico.forEach(amostra => conferir(amostra.tempo, amostra));
    const linhas = simulacao.atual.exportarCSV().trim().split('\n').slice(1);
    linhas.forEach(linha => {
      const [tempo, x, velocidade, altura, energiaCinetica, energiaPotencial, energiaTotal] = linha.split(',').map(Number);
      conferir(tempo, { x, velocidade, altura, energiaCinetica, energiaPotencial, energiaTotal });
    });
    conferir(simulacao.atual.tempo, simulacao.atual.metricas);
  }
});
test('velocidade publicada preserva o sinal no retorno e energia cinética permanece positiva', () => {
  const inclinacao = 0.5;
  const fatorArco = Math.hypot(1, inclinacao);
  const simulacao = montar({ dominio: { minimo: 0, maximo: 5 }, velocidadeInicial: 2 }, x => 2 + inclinacao * x);
  simulacao.chamar('iniciar');
  simulacao.quadro(0);
  for (let i = 1; i <= 36; i++) simulacao.quadro(i * 1000 / 60);
  simulacao.chamar('pausar');
  const aceleracao = -9.81 * inclinacao / fatorArco;
  const velocidade = 2 + aceleracao * 0.6;
  const x = (2 * 0.6 + 0.5 * aceleracao * 0.6 ** 2) / fatorArco;
  perto(simulacao.atual.tempo, 0.6);
  assert.ok(simulacao.atual.metricas.velocidade < 0);
  perto(simulacao.atual.metricas.velocidade, velocidade, 1e-8);
  perto(simulacao.atual.metricas.altura, 2 + inclinacao * x, 1e-8);
  perto(simulacao.atual.metricas.energiaCinetica, 6 * velocidade ** 2, 1e-7);
  perto(simulacao.atual.metricas.energiaTotal, 24 + 12 * 9.81 * 2, 1e-7);
});
test('chegada em alta velocidade usa o instante físico final nos indicadores, amostras e CSV', () => {
  const simulacao = montar({ dominio: { minimo: 0, maximo: 1 }, velocidadeInicial: 1000 }, () => 0, 0.025);
  simulacao.segundo();
  assert.equal(simulacao.atual.estado, 'LIMITE_FINAL');
  perto(simulacao.atual.tempo, 0.001, 1e-10);
  perto(simulacao.atual.particula.x, 1);
  perto(simulacao.atual.metricas.velocidade, 1000);
  perto(simulacao.atual.metricas.energiaCinetica, 6000000);
  const final = simulacao.atual.historico.at(-1);
  perto(final.tempo, 0.001, 1e-10);
  perto(final.x / final.tempo, final.velocidade, 1e-4);
  const ultimaLinha = simulacao.atual.exportarCSV().trim().split('\n').at(-1).split(',').map(Number);
  perto(ultimaLinha[0], 0.001, 1e-10);
  assert.deepEqual(ultimaLinha.slice(1), [1, 1000, 0, 6000000, 0, 6000000]);
  simulacao.intervalo(0.05);
  assert.deepEqual(simulacao.atual.historico.at(-1), final);
});
test('repouso por atrito registra o instante de parada dentro do passo físico', () => {
  const velocidadeInicial = 0.037;
  const gravidade = 10;
  const coeficienteAtrito = 0.3;
  const simulacao = montar({ gravidade, coeficienteAtrito, velocidadeInicial, massa: 3.2 }, () => 2, 0.025);
  simulacao.segundo();
  const instanteParada = velocidadeInicial / (coeficienteAtrito * gravidade);
  const distanciaParada = velocidadeInicial ** 2 / (2 * coeficienteAtrito * gravidade);
  assert.equal(simulacao.atual.estado, 'ENCERRADO');
  perto(simulacao.atual.tempo, instanteParada, 1e-9);
  perto(simulacao.atual.particula.x, distanciaParada, 1e-9);
  assert.equal(simulacao.atual.metricas.velocidade, 0);
  assert.equal(simulacao.atual.metricas.energiaCinetica, 0);
  assert.equal(simulacao.atual.metricas.altura, 2);
  assert.equal(simulacao.atual.metricas.energiaPotencial, 64);
  assert.equal(simulacao.atual.metricas.energiaTotal, 64);
  perto(simulacao.atual.historico.at(-1).tempo, instanteParada, 1e-9);
});
test('alterar escala temporal preserva a execução; alterar física reinicia', () => {
  const simulacao = montar();
  simulacao.segundo();
  simulacao.taxa(2);
  perto(simulacao.atual.tempo, 1);
  simulacao.quadro(1100);
  perto(simulacao.atual.tempo, 1.2);
  simulacao.configurar({ velocidadeInicial: 4 });
  assert.equal(simulacao.atual.estado, 'PRONTO');
  perto(simulacao.atual.tempo, 0);
  perto(simulacao.atual.particula.velocidade, 4);
  perto(simulacao.atual.metricas.energiaCinetica, 96);
  assert.equal(simulacao.atual.historico.length, 1);
});
test('aba oculta não acumula tempo para o retorno', () => {
  const simulacao = montar();
  simulacao.segundo();
  simulacao.visibilidade(true);
  simulacao.quadro(6000);
  perto(simulacao.atual.tempo, 1);
  simulacao.visibilidade(false);
  simulacao.quadro(10000);
  perto(simulacao.atual.tempo, 1);
  simulacao.quadro(10000 + 1000 / 60);
  perto(simulacao.atual.tempo, 1 + 1 / 60);
});
test('chegada encerra o RAF e exige reinício para novo ensaio', () => {
  const simulacao = montar({ dominio: { minimo: 0, maximo: 1 }, velocidadeInicial: 120 });
  simulacao.chamar('iniciar');
  simulacao.quadro(0);
  simulacao.quadro(20);
  assert.equal(simulacao.atual.estado, 'LIMITE_FINAL');
  perto(simulacao.atual.particula.x, 1);
  const tempo = simulacao.atual.tempo;
  simulacao.chamar('iniciar');
  simulacao.quadro(1000);
  perto(simulacao.atual.tempo, tempo);
  simulacao.chamar('reiniciar');
  assert.equal(simulacao.atual.estado, 'PRONTO');
  perto(simulacao.atual.tempo, 0);
});

test('retorno ao limite inicial preserva sentido e exige reinício para novo ensaio', () => {
  const simulacao = montar({ dominio: { minimo: 0, maximo: 5 }, velocidadeInicial: 2 }, x => x / 2);
  simulacao.segundo();
  assert.equal(simulacao.atual.estado, 'ENCERRADO');
  perto(simulacao.atual.particula.x, 0);
  perto(simulacao.atual.particula.velocidade, -2, 1e-7);
  const energia = simulacao.atual.metricas.energiaTotal;
  const tempo = simulacao.atual.tempo;
  const historico = simulacao.atual.historico;
  simulacao.chamar('iniciar');
  simulacao.chamar('passo');
  simulacao.quadro(1000);
  simulacao.quadro(1010);
  assert.equal(simulacao.atual.estado, 'ENCERRADO');
  perto(simulacao.atual.particula.x, 0);
  perto(simulacao.atual.metricas.energiaTotal, energia, 1e-7);
  assert.equal(simulacao.atual.tempo, tempo);
  assert.equal(simulacao.atual.historico, historico);
  simulacao.chamar('reiniciar');
  assert.equal(simulacao.atual.estado, 'PRONTO');
  perto(simulacao.atual.particula.velocidade, 2);
});

test('quadros sem passo físico preservam os indicadores e o histórico publicado', () => {
  const simulacao = montar();
  const inicial = simulacao.atual;
  simulacao.chamar('iniciar');
  for (const instante of [0, 1, 4, 8]) {
    simulacao.quadro(instante);
    assert.equal(simulacao.atual.metricas, inicial.metricas);
    assert.equal(simulacao.atual.particula, inicial.particula);
    assert.equal(simulacao.atual.historico, inicial.historico);
    assert.equal(simulacao.atual.tempo, 0);
  }
  simulacao.quadro(9);
  const avancado = simulacao.atual;
  perto(avancado.tempo, PASSO_SIMULACAO);
  assert.notEqual(avancado.metricas, inicial.metricas);
  assert.equal(avancado.historico, inicial.historico);
  simulacao.visibilidade(true);
  simulacao.quadro(2000);
  assert.equal(simulacao.atual.metricas, avancado.metricas);
  assert.equal(simulacao.atual.particula, avancado.particula);
  assert.equal(simulacao.atual.historico, avancado.historico);
});

test('novas amostras não modificam snapshots anteriormente publicados', () => {
  const simulacao = montar();
  simulacao.segundo();
  const anterior = simulacao.atual.historico;
  const copia = structuredClone(anterior);
  simulacao.quadro(1050);
  assert.notEqual(simulacao.atual.historico, anterior);
  assert.equal(simulacao.atual.historico.length, anterior.length + 1);
  assert.deepEqual(anterior, copia);
  simulacao.intervalo(0.025);
  assert.deepEqual(anterior, copia);
  simulacao.chamar('reiniciar');
  assert.deepEqual(anterior, copia);
  assert.equal(simulacao.atual.historico.length, 1);
});
