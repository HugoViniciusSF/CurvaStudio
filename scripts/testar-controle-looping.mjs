import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

// Exercita os efeitos do controlador com quadros e visibilidade determinísticos.
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
    contents: 'export * from "./src/ganchos/useLooping.ts"; export * from "./src/simulacao/looping3d.ts"; export { contexto } from "react";',
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{
    name: 'react-simulado', setup(compilador) {
      compilador.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'simulado' }));
      compilador.onLoad({ filter: /.*/, namespace: 'simulado' }, () => ({ contents: reactSimulado }));
    },
  }],
});
const {
  useLooping, prepararTrajetoria3D, exportarCSVLooping,
  PASSO_LOOPING, INTERVALOS_LOOPING, contexto,
} = await import(`data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString('base64')}`);

const RETA_ESPACIAL = [{ x: 0, y: 2, z: 1 }, { x: 600, y: 2, z: 801 }];
function montar(alteracoes = {}, pontos = RETA_ESPACIAL, ativo = true) {
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
  const props = [prepararTrajetoria3D(pontos), { massa: 12, gravidade: 0, velocidadeInicial: 3, ...alteracoes }, ativo];
  let atual;
  function renderizar() {
    let tentativas = 0;
    do {
      assert.ok(++tentativas < 25, 'renderização deve estabilizar');
      contexto.indice = 0;
      contexto.efeitos = [];
      contexto.alterado = false;
      atual = useLooping(...props);
      contexto.efeitos.forEach(efeito => efeito());
    } while (contexto.alterado);
  }
  renderizar();
  return {
    get atual() { return atual; },
    get quadrosAgendados() { return quadros.size; },
    chamar(nome, ...argumentos) { atual[nome](...argumentos); renderizar(); },
    quadro(tempo) {
      const callbacks = [...quadros.values()];
      quadros.clear();
      callbacks.forEach(callback => callback(tempo));
      renderizar();
    },
    reproduzir(hz = 60, segundos = 1) {
      this.chamar('alternar');
      this.quadro(0);
      for (let i = 1; i <= hz * segundos; i++) this.quadro(i * 1000 / hz);
    },
    ativar(valor) { props[2] = valor; renderizar(); },
    configurar(alteracao) { props[1] = { ...props[1], ...alteracao }; renderizar(); },
    trajetoria(novosPontos) { props[0] = prepararTrajetoria3D(novosPontos); renderizar(); },
    visibilidade(oculta) { document.hidden = oculta; eventos.get('visibilitychange')?.(); },
  };
}
function perto(obtido, esperado, tolerancia = 1e-8) {
  assert.ok(Math.abs(obtido - esperado) <= tolerancia, `${obtido} ≈ ${esperado}`);
}
function instantes(simulacao) { return simulacao.atual.amostras.map(amostra => amostra.tempo); }
function conferirInstantes(simulacao, esperados) {
  assert.equal(simulacao.atual.amostras.length, esperados.length);
  instantes(simulacao).forEach((tempo, indice) => perto(tempo, esperados[indice]));
}

test('looping: reta espacial mantém tempo, posição e rapidez em 30, 60 e 144 Hz', () => {
  for (const hz of [30, 60, 144]) {
    const simulacao = montar();
    simulacao.reproduzir(hz);
    const estado = simulacao.atual.estado;
    perto(estado.tempo, 1);
    perto(estado.distancia, 3);
    perto(estado.posicao.x, 1.8);
    perto(estado.posicao.y, 2);
    perto(estado.posicao.z, 3.4);
    perto(estado.velocidade, 3);
    perto(estado.energiaMecanica, 54);
    assert.equal(simulacao.atual.amostras.length, 21);
    assert.equal(simulacao.atual.erro, '');
  }
});

test('looping: ritmos de 0,25 a 30 vezes alteram tempo sem mudar a velocidade física', () => {
  for (const ritmo of [0.25, 0.5, 1, 2, 10, 30]) {
    const simulacao = montar();
    simulacao.chamar('definirRitmo', ritmo);
    simulacao.reproduzir();
    perto(simulacao.atual.estado.tempo, ritmo);
    perto(simulacao.atual.estado.distancia, 3 * ritmo);
    perto(simulacao.atual.estado.velocidade, 3);
    perto(simulacao.atual.estado.energiaCinetica, 54);
  }
});

test('looping: todos os intervalos selecionam a cadência física nas três taxas de quadros', () => {
  assert.deepEqual(INTERVALOS_LOOPING, [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2]);
  for (const intervalo of INTERVALOS_LOOPING) {
    for (const hz of [30, 60, 144]) {
      const simulacao = montar();
      simulacao.chamar('alterarIntervalo', intervalo);
      simulacao.reproduzir(hz, 4);
      conferirInstantes(simulacao, Array.from({ length: 4 / intervalo + 1 }, (_, i) => i * intervalo));
      simulacao.atual.amostras.forEach(amostra => {
        perto(amostra.distancia, 3 * amostra.tempo);
        perto(amostra.posicao.x, 1.8 * amostra.tempo);
        perto(amostra.posicao.z, 1 + 2.4 * amostra.tempo);
      });
    }
  }
});

test('looping: ocultar a guia pausa RAF e preserva estado, histórico e escolhas', () => {
  const simulacao = montar();
  simulacao.chamar('alterarIntervalo', 0.025);
  simulacao.chamar('definirRitmo', 2);
  simulacao.reproduzir();
  const anterior = simulacao.atual;
  assert.equal(anterior.executando, true);
  simulacao.ativar(false);
  assert.equal(simulacao.atual.executando, false);
  assert.equal(simulacao.quadrosAgendados, 0);
  simulacao.quadro(8000);
  assert.equal(simulacao.atual.estado, anterior.estado);
  assert.equal(simulacao.atual.amostras, anterior.amostras);
  assert.equal(simulacao.atual.intervalo, 0.025);
  assert.equal(simulacao.atual.ritmo, 2);

  simulacao.ativar(true);
  simulacao.quadro(10000);
  assert.equal(simulacao.atual.executando, false);
  assert.equal(simulacao.quadrosAgendados, 0);
  assert.equal(simulacao.atual.estado, anterior.estado);
  simulacao.chamar('alternar');
  simulacao.quadro(11000);
  assert.equal(simulacao.atual.estado, anterior.estado);
  simulacao.quadro(11050);
  perto(simulacao.atual.estado.tempo, 2.1);
});

test('looping: guia inicialmente inativa não executa até ser ativada explicitamente', () => {
  const simulacao = montar({}, RETA_ESPACIAL, false);
  simulacao.chamar('alternar');
  simulacao.quadro(0);
  simulacao.quadro(1000);
  assert.equal(simulacao.atual.executando, false);
  assert.equal(simulacao.atual.estado.tempo, 0);
  assert.equal(simulacao.quadrosAgendados, 0);
  simulacao.ativar(true);
  assert.equal(simulacao.atual.executando, false);
  simulacao.reproduzir();
  perto(simulacao.atual.estado.tempo, 1);
});

test('looping: mudar intervalo recupera o mesmo histórico sem reiniciar ou alterar a física', () => {
  const simulacao = montar();
  simulacao.reproduzir();
  const anterior = simulacao.atual;
  const csvOriginal = exportarCSVLooping(anterior.amostras);
  simulacao.chamar('alterarIntervalo', 0.025);
  assert.equal(simulacao.atual.estado, anterior.estado);
  assert.equal(simulacao.atual.executando, true);
  conferirInstantes(simulacao, Array.from({ length: 41 }, (_, i) => i * 0.025));
  anterior.amostras.forEach((amostra, indice) => assert.equal(simulacao.atual.amostras[2 * indice], amostra));
  simulacao.chamar('pausar');
  simulacao.chamar('alterarIntervalo', 0.5);
  conferirInstantes(simulacao, [0, 0.5, 1]);
  simulacao.chamar('alterarIntervalo', 0.05);
  assert.deepEqual(simulacao.atual.amostras, anterior.amostras);
  assert.equal(exportarCSVLooping(simulacao.atual.amostras), csvOriginal);
  assert.equal(simulacao.atual.estado, anterior.estado);
  simulacao.quadro(2000);
  assert.equal(simulacao.atual.estado, anterior.estado);
});

test('looping: passos manuais persistem na reamostragem e não deslocam a grade regular', () => {
  const simulacao = montar();
  simulacao.chamar('definirRitmo', 30);
  simulacao.chamar('passo');
  simulacao.chamar('passo');
  simulacao.chamar('passo');
  perto(simulacao.atual.estado.tempo, 3 * PASSO_LOOPING);
  assert.equal(simulacao.atual.executando, false);
  conferirInstantes(simulacao, [0, 1 / 120, 2 / 120, 0.025]);
  const manuais = simulacao.atual.amostras;
  simulacao.chamar('alterarIntervalo', 2);
  assert.deepEqual(simulacao.atual.amostras, manuais);
  simulacao.chamar('alterarIntervalo', 0.025);
  assert.deepEqual(simulacao.atual.amostras, manuais);
  simulacao.chamar('definirRitmo', 1);
  simulacao.chamar('alternar');
  simulacao.quadro(0);
  simulacao.quadro(25);
  conferirInstantes(simulacao, [0, 1 / 120, 2 / 120, 0.025, 0.05]);
});

test('looping: mudança de seleção com o mesmo tamanho preserva o estado final correto', () => {
  const simulacao = montar({ velocidadeInicial: 120 }, [{ x: 0, y: 0, z: 0 }, { x: 36, y: 0, z: 0 }]);
  simulacao.chamar('alterarIntervalo', 0.1);
  simulacao.chamar('alternar');
  simulacao.quadro(0);
  simulacao.quadro(11 * 1000 / 120);
  simulacao.chamar('passo');
  simulacao.chamar('alternar');
  simulacao.quadro(1000);
  simulacao.quadro(1250);
  assert.equal(simulacao.atual.estado.estado, 'concluido');
  conferirInstantes(simulacao, [0, 0.1, 0.2, 0.3]);
  const anterior = simulacao.atual;
  simulacao.chamar('alterarIntervalo', 0.25);
  conferirInstantes(simulacao, [0, 0.1, 0.25, 0.3]);
  assert.equal(simulacao.atual.estado, anterior.estado);
  assert.equal(simulacao.atual.amostras.at(-1), anterior.amostras.at(-1));
  assert.notDeepEqual(simulacao.atual.amostras, anterior.amostras);
});

test('looping: fim usa tempo parcial exato, inclui amostra final e encerra RAF', () => {
  for (const comprimento of [1, 25]) {
    const simulacao = montar({ velocidadeInicial: 1000 }, [{ x: 0, y: 0, z: 0 }, { x: comprimento, y: 0, z: 0 }]);
    simulacao.chamar('alterarIntervalo', 0.025);
    simulacao.reproduzir();
    const anterior = simulacao.atual;
    assert.equal(anterior.estado.estado, 'concluido');
    assert.equal(anterior.executando, false);
    assert.equal(simulacao.quadrosAgendados, 0);
    perto(anterior.estado.tempo, comprimento / 1000, 1e-12);
    perto(anterior.estado.posicao.x, comprimento);
    perto(anterior.estado.velocidade, 1000);
    conferirInstantes(simulacao, [0, comprimento / 1000]);
    assert.equal(anterior.amostras.at(-1), anterior.estado);
    simulacao.chamar('passo');
    simulacao.quadro(10000);
    assert.equal(simulacao.atual.estado, anterior.estado);
    assert.equal(simulacao.atual.amostras, anterior.amostras);
    simulacao.chamar('alterarIntervalo', 2);
    conferirInstantes(simulacao, [0, comprimento / 1000]);
    simulacao.chamar('alternar');
    assert.equal(simulacao.atual.estado.tempo, 0);
    assert.equal(simulacao.atual.executando, false);
  }
});

test('looping: CSV exporta coordenadas espaciais, unidades e energias das mesmas amostras', () => {
  const simulacao = montar({ gravidade: 10 });
  simulacao.reproduzir();
  const linhas = exportarCSVLooping(simulacao.atual.amostras).trim().split('\n');
  assert.equal(linhas[0], 'tempo_s,distancia_m,x_m,y_m,z_m,velocidade_m_s,energia_cinetica_J,energia_potencial_J,energia_mecanica_J');
  assert.equal(linhas.length, simulacao.atual.amostras.length + 1);
  assert.deepEqual(linhas.at(-1).split(',').map(Number), [1, 3, 1.8, 2, 3.4, 3, 54, 240, 294]);
  linhas.slice(1).forEach((linha, indice) => {
    const valores = linha.split(',').map(Number);
    const estado = simulacao.atual.amostras[indice];
    const esperados = [estado.tempo, estado.distancia, estado.posicao.x, estado.posicao.y, estado.posicao.z,
      estado.velocidade, estado.energiaCinetica, estado.energiaPotencial, estado.energiaMecanica];
    valores.forEach((valor, coluna) => perto(valor, esperados[coluna]));
  });
});

test('looping: indicadores e amostras de uma rampa 3D concordam com solução analítica', () => {
  const massa = 3.2;
  const gravidade = 9.81;
  const velocidadeInicial = 6;
  const origem = { x: 0, y: 8, z: 1 };
  const delta = { x: 60, y: -40, z: 80 };
  const comprimento = Math.hypot(delta.x, delta.y, delta.z);
  const aceleracao = -gravidade * delta.y / comprimento;
  const simulacao = montar({ massa, gravidade, velocidadeInicial }, [origem, { x: 60, y: -32, z: 81 }]);
  simulacao.reproduzir(144);
  simulacao.chamar('pausar');
  const conferir = estado => {
    const t = estado.tempo;
    const distancia = velocidadeInicial * t + aceleracao * t * t / 2;
    const velocidade = velocidadeInicial + aceleracao * t;
    const altura = origem.y + delta.y * distancia / comprimento;
    perto(estado.distancia, distancia);
    perto(estado.velocidade, velocidade);
    for (const eixo of ['x', 'y', 'z']) perto(estado.posicao[eixo], origem[eixo] + delta[eixo] * distancia / comprimento);
    perto(estado.energiaCinetica, massa * velocidade ** 2 / 2);
    perto(estado.energiaPotencial, massa * gravidade * altura);
    perto(estado.energiaMecanica, massa * velocidadeInicial ** 2 / 2 + massa * gravidade * origem.y);
  };
  conferir(simulacao.atual.estado);
  for (const intervalo of [0.025, 0.1, 0.5]) {
    simulacao.chamar('alterarIntervalo', intervalo);
    simulacao.atual.amostras.forEach(conferir);
  }
});

test('looping: retorno registra velocidade negativa e tempo físico de chegada à origem', () => {
  const gravidade = 9.81;
  const velocidadeInicial = 2;
  const comprimento = Math.hypot(6, 4, 8);
  const simulacao = montar({ gravidade, velocidadeInicial }, [{ x: 0, y: 2, z: 1 }, { x: 6, y: 6, z: 9 }]);
  simulacao.reproduzir(60, 2);
  assert.equal(simulacao.atual.estado.estado, 'retornou');
  assert.equal(simulacao.atual.executando, false);
  assert.equal(simulacao.quadrosAgendados, 0);
  const estado = simulacao.atual.estado;
  perto(estado.tempo, 2 * velocidadeInicial / (gravidade * 4 / comprimento));
  perto(estado.distancia, 0);
  perto(estado.velocidade, -velocidadeInicial);
  perto(estado.energiaCinetica, 24);
  perto(estado.energiaMecanica, 24 + 12 * gravidade * 2);
  assert.equal(simulacao.atual.amostras.at(-1), estado);
});

test('looping: reiniciar e alterar condições descartam histórico preservando intervalo e ritmo', () => {
  const simulacao = montar();
  simulacao.chamar('alterarIntervalo', 0.5);
  simulacao.chamar('definirRitmo', 2);
  simulacao.reproduzir();
  simulacao.chamar('reiniciar');
  assert.equal(simulacao.atual.executando, false);
  assert.equal(simulacao.atual.estado.tempo, 0);
  assert.equal(simulacao.atual.intervalo, 0.5);
  assert.equal(simulacao.atual.ritmo, 2);
  conferirInstantes(simulacao, [0]);
  simulacao.reproduzir();
  conferirInstantes(simulacao, [0, 0.5, 1, 1.5, 2]);
  simulacao.configurar({ velocidadeInicial: 4, massa: 3 });
  assert.equal(simulacao.atual.estado.tempo, 0);
  assert.equal(simulacao.atual.estado.velocidade, 4);
  assert.equal(simulacao.atual.estado.energiaCinetica, 24);
  assert.equal(simulacao.atual.executando, false);
  assert.equal(simulacao.quadrosAgendados, 0);
  conferirInstantes(simulacao, [0]);
  simulacao.reproduzir();
  simulacao.trajetoria([{ x: 10, y: 20, z: 30 }, { x: 20, y: 20, z: 30 }]);
  assert.deepEqual(simulacao.atual.estado.posicao, { x: 10, y: 20, z: 30 });
  assert.equal(simulacao.atual.estado.tempo, 0);
  assert.equal(simulacao.atual.executando, false);
  conferirInstantes(simulacao, [0]);
});

test('looping: aba do navegador oculta não acumula tempo para o retorno', () => {
  const simulacao = montar();
  simulacao.reproduzir();
  const anterior = simulacao.atual;
  simulacao.visibilidade(true);
  simulacao.quadro(6000);
  simulacao.quadro(12000);
  assert.equal(simulacao.atual.estado, anterior.estado);
  assert.equal(simulacao.atual.amostras, anterior.amostras);
  simulacao.visibilidade(false);
  simulacao.quadro(18000);
  assert.equal(simulacao.atual.estado, anterior.estado);
  simulacao.quadro(18000 + 1000 / 60);
  perto(simulacao.atual.estado.tempo, 1 + 1 / 60);
});

test('looping: pausa e retomada não contam o intervalo pausado', () => {
  const simulacao = montar();
  simulacao.reproduzir();
  simulacao.chamar('pausar');
  const anterior = simulacao.atual;
  assert.equal(simulacao.quadrosAgendados, 0);
  simulacao.quadro(10000);
  assert.equal(simulacao.atual.estado, anterior.estado);
  simulacao.chamar('alternar');
  simulacao.quadro(11000);
  assert.equal(simulacao.atual.estado, anterior.estado);
  simulacao.quadro(11050);
  perto(simulacao.atual.estado.tempo, 1.05);
});

test('looping: intervalo inválido é ignorado sem substituir histórico ou reiniciar', () => {
  const simulacao = montar();
  simulacao.chamar('alterarIntervalo', 0.25);
  simulacao.reproduzir();
  const anterior = simulacao.atual;
  for (const intervalo of [NaN, Infinity, 0, -1, 0.03, '0.1', undefined]) {
    simulacao.chamar('alterarIntervalo', intervalo);
    assert.equal(simulacao.atual.intervalo, 0.25);
    assert.equal(simulacao.atual.estado, anterior.estado);
    assert.equal(simulacao.atual.amostras, anterior.amostras);
    assert.equal(simulacao.atual.executando, true);
  }
});

test('looping: quadros sem avanço preservam snapshots e novas amostras não modificam os anteriores', () => {
  const simulacao = montar();
  const inicial = simulacao.atual;
  simulacao.chamar('alternar');
  for (const instante of [0, 1, 4, 8]) {
    simulacao.quadro(instante);
    assert.equal(simulacao.atual.estado, inicial.estado);
    assert.equal(simulacao.atual.amostras, inicial.amostras);
  }
  simulacao.quadro(50);
  const anterior = simulacao.atual.amostras;
  const copia = structuredClone(anterior);
  simulacao.quadro(100);
  assert.notEqual(simulacao.atual.amostras, anterior);
  assert.deepEqual(anterior, copia);
  simulacao.chamar('alterarIntervalo', 0.025);
  assert.deepEqual(anterior, copia);
  simulacao.chamar('reiniciar');
  assert.deepEqual(anterior, copia);
});
