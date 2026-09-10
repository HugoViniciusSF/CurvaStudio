import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const compilado = await build({
  entryPoints: [fileURLToPath(new URL('../src/simulacao/looping3d.ts', import.meta.url))],
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
});
const {
  criarTrajetoriaLooping, prepararTrajetoria3D, criarEstadoLooping, avancarLooping, posicaoNaTrajetoria3D,
} = await import(`data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString('base64')}`);

const base = { massa: 2, gravidade: 9.81, velocidadeInicial: 0 };
const ponto = (x, y, z = 0) => ({ x, y, z });
function perto(atual, esperado, tolerancia = 1e-8) {
  assert.ok(Math.abs(atual - esperado) <= tolerancia, `${atual} deve estar a até ${tolerancia} de ${esperado}`);
}
function executar(trajetoria, configuracao = base, dt = 1 / 120) {
  const inicial = criarEstadoLooping(trajetoria, configuracao);
  let atual = inicial;
  let passos = 0;
  let voltou = false;
  while (['pronto', 'em_movimento'].includes(atual.estado) && passos++ < 24000) {
    atual = avancarLooping(trajetoria, configuracao, atual, dt);
    voltou ||= atual.velocidade < 0;
    perto(atual.energiaMecanica, inicial.energiaMecanica, Math.max(1e-8, Math.abs(inicial.energiaMecanica) * 1e-12));
    perto(atual.energiaMecanica, atual.energiaCinetica + atual.energiaPotencial);
    assert.ok(Object.values(atual.posicao).every(Number.isFinite));
  }
  assert.ok(passos < 24000, 'o cenário deve chegar a uma condição final');
  return { inicial, atual, voltou };
}

test('a profundidade é espacial, separa entrada e saída e aumenta o comprimento', () => {
  const parametros = { raio: 2, alturaInicial: 6, profundidade: 3 };
  const pontos = criarTrajetoriaLooping(parametros);
  const espacial = prepararTrajetoria3D(pontos);
  const plano = prepararTrajetoria3D(criarTrajetoriaLooping({ ...parametros, profundidade: 0 }));
  assert.deepEqual(pontos[0], ponto(-6, 6));
  assert.deepEqual(pontos[120], ponto(0, 0));
  assert.deepEqual(pontos[840], ponto(0, 0, 3));
  assert.deepEqual(pontos.at(-1), ponto(6, 0, 3));
  perto(Math.max(...pontos.slice(120, 841).map(p => p.y)), 4);
  assert.ok(espacial.comprimentoTotal > plano.comprimentoTotal);
});

test('o comprimento inclui z e mantém cruzamentos na ordem desenhada', () => {
  const pontos = [ponto(0, 0), ponto(0, 0), ponto(3, 0, 4), ponto(0, 0), ponto(-3, 0, 4)];
  const trajetoria = prepararTrajetoria3D(pontos);
  assert.equal(trajetoria.pontos.length, 4);
  assert.deepEqual(trajetoria.comprimentosAcumulados, [0, 5, 10, 15]);
  assert.equal(trajetoria.comprimentoTotal, 15);
  assert.deepEqual(posicaoNaTrajetoria3D(trajetoria, 2.5), ponto(1.5, 0, 2));
  const configuracao = { ...base, velocidadeInicial: 2 };
  const inicial = criarEstadoLooping(trajetoria, configuracao);
  const aposCruzamento = avancarLooping(trajetoria, configuracao, inicial, 6);
  perto(aposCruzamento.distancia, 12);
  perto(aposCruzamento.posicao.x, -1.2);
  perto(aposCruzamento.posicao.z, 1.6);
  assert.equal(aposCruzamento.estado, 'em_movimento');
});

test('descida a partir do repouso obedece à solução analítica em uma rampa 3D', () => {
  const trajetoria = prepararTrajetoria3D([ponto(0, 10, 0), ponto(3, 6, 12)]);
  const aceleracao = base.gravidade * 4 / 13;
  const resultado = avancarLooping(trajetoria, base, criarEstadoLooping(trajetoria, base), 1);
  perto(resultado.velocidade, aceleracao);
  perto(resultado.distancia, aceleracao / 2);
  perto(resultado.posicao.y, 10 - 4 / 13 * resultado.distancia);
  perto(resultado.energiaMecanica, base.massa * base.gravidade * 10);
});

test('a fronteira final registra o instante de chegada e conserva a velocidade', () => {
  const trajetoria = prepararTrajetoria3D([ponto(0, 10), ponto(3, 6, 12)]);
  const atual = avancarLooping(trajetoria, base, criarEstadoLooping(trajetoria, base), 10);
  perto(atual.tempo, Math.sqrt(2 * 13 / (base.gravidade * 4 / 13)));
  perto(atual.velocidade, Math.sqrt(2 * base.gravidade * 4));
  assert.equal(atual.estado, 'concluido');
  assert.deepEqual(atual.posicao, ponto(3, 6, 12));
});

test('inversão e retorno ao início no mesmo passo têm tempo e energia corretos', () => {
  const trajetoria = prepararTrajetoria3D([ponto(0, 0), ponto(10, 10)]);
  const configuracao = { ...base, velocidadeInicial: 2 };
  const inicial = criarEstadoLooping(trajetoria, configuracao);
  const atual = avancarLooping(trajetoria, configuracao, inicial, 2);
  assert.equal(atual.estado, 'retornou');
  perto(atual.distancia, 0);
  perto(atual.velocidade, -2);
  perto(atual.tempo, 4 / (base.gravidade / Math.SQRT2));
  perto(atual.energiaMecanica, inicial.energiaMecanica);
});

test('chegar exatamente à inversão não congela o movimento', () => {
  const trajetoria = prepararTrajetoria3D([ponto(0, 0), ponto(10, 10)]);
  const configuracao = { ...base, velocidadeInicial: 2 };
  const tempoInversao = 2 / (base.gravidade / Math.SQRT2);
  const inversao = avancarLooping(trajetoria, configuracao, criarEstadoLooping(trajetoria, configuracao), tempoInversao);
  perto(inversao.velocidade, 0);
  perto(inversao.posicao.y, 2 ** 2 / (2 * base.gravidade));
  assert.equal(inversao.estado, 'em_movimento');
  const retorno = avancarLooping(trajetoria, configuracao, inversao, 0.01);
  assert.ok(retorno.velocidade < 0);
});

for (const profundidade of [0, 3]) {
  test(`o looping completo conserva energia a 120 Hz com profundidade ${profundidade} m`, () => {
    const trajetoria = prepararTrajetoria3D(criarTrajetoriaLooping({ raio: 2, alturaInicial: 6, profundidade }));
    const { atual, voltou } = executar(trajetoria);
    assert.equal(atual.estado, 'concluido');
    assert.equal(voltou, false);
    perto(atual.velocidade, Math.sqrt(2 * base.gravidade * 6));
  });
}

test('energia insuficiente faz a partícula retornar sem saltar para a saída', () => {
  const trajetoria = prepararTrajetoria3D(criarTrajetoriaLooping({ raio: 2, alturaInicial: 2, profundidade: 3 }));
  const { atual, voltou } = executar(trajetoria);
  assert.equal(atual.estado, 'retornou');
  assert.equal(voltou, true);
  perto(atual.distancia, 0);
  perto(atual.posicao.y, 2);
  perto(atual.velocidade, 0, 1e-7);
});

// Oráculo independente: integra dt=ds/v(s) em cada segmento, usando as
// velocidades dadas pela energia. A volta percorre os mesmos trechos.
function tempoRetornoPorEnergia(pontos, gravidade) {
  const alturaInicial = pontos[0].y;
  let tempo = 0;
  for (let indice = 1; indice < pontos.length; indice++) {
    const inicio = pontos[indice - 1];
    const fim = pontos[indice];
    const comprimento = Math.hypot(fim.x - inicio.x, fim.y - inicio.y, fim.z - inicio.z);
    const velocidadeInicial = Math.sqrt(2 * gravidade * (alturaInicial - inicio.y));
    const quadradoFinal = 2 * gravidade * (alturaInicial - fim.y);
    if (quadradoFinal < 0) {
      tempo += velocidadeInicial / (gravidade * (fim.y - inicio.y) / comprimento);
      return tempo * 2;
    }
    tempo += 2 * comprimento / (velocidadeInicial + Math.sqrt(quadradoFinal));
  }
  throw new Error('O cenário deveria retornar antes da saída.');
}

test('retorno com velocidade nula encerra na primeira chegada, sem rebotes por arredondamento', () => {
  for (const alturaInicial of [2, 2.8, 3]) {
    const pontos = criarTrajetoriaLooping({ raio: 2, alturaInicial, profundidade: 1.2 });
    const trajetoria = prepararTrajetoria3D(pontos);
    const esperado = tempoRetornoPorEnergia(pontos, base.gravidade);
    for (const dt of [1 / 120, 1 / 60, 1 / 1000, 1, 100]) {
      const { atual } = executar(trajetoria, base, dt);
      assert.equal(atual.estado, 'retornou');
      perto(atual.tempo, esperado, 1e-7);
      perto(atual.distancia, 0);
      perto(atual.velocidade, 0);
    }
  }
});

test('a igualdade h=2R atinge o topo em repouso e não inventa impulso para atravessá-lo', () => {
  const trajetoria = prepararTrajetoria3D(criarTrajetoriaLooping({ raio: 2, alturaInicial: 4, profundidade: 3 }));
  const { atual } = executar(trajetoria);
  assert.equal(atual.estado, 'repouso');
  perto(atual.posicao.y, 4);
  perto(atual.posicao.z, 1.5);
  perto(atual.velocidade, 0);
});

test('altura pouco acima de 2R atravessa o topo na guia confinada', () => {
  const trajetoria = prepararTrajetoria3D(criarTrajetoriaLooping({ raio: 2, alturaInicial: 4.01, profundidade: 3 }));
  assert.equal(executar(trajetoria).atual.estado, 'concluido');
});

test('a inversão em um vértice regular segue a descida sem escolher o segmento da subida', () => {
  const trajetoria = prepararTrajetoria3D([ponto(0, 0), ponto(1, 1), ponto(2, 2)]);
  const configuracao = { ...base, velocidadeInicial: Math.sqrt(2 * base.gravidade) };
  const { atual, voltou } = executar(trajetoria, configuracao);
  assert.equal(atual.estado, 'retornou');
  assert.equal(voltou, true);
  perto(atual.velocidade, -configuracao.velocidadeInicial);
});

test('mudar a massa escala energias e preserva o movimento', () => {
  const trajetoria = prepararTrajetoria3D(criarTrajetoriaLooping({ raio: 2, alturaInicial: 6, profundidade: 3 }));
  const leve = avancarLooping(trajetoria, base, criarEstadoLooping(trajetoria, base), 1);
  const configuracao = { ...base, massa: base.massa * 7 };
  const pesada = avancarLooping(trajetoria, configuracao, criarEstadoLooping(trajetoria, configuracao), 1);
  assert.equal(pesada.distancia, leve.distancia);
  assert.equal(pesada.velocidade, leve.velocidade);
  perto(pesada.energiaCinetica, leve.energiaCinetica * 7);
  perto(pesada.energiaPotencial, leve.energiaPotencial * 7);
  perto(pesada.energiaMecanica, leve.energiaMecanica * 7);
});

test('o movimento a 1000 m/s resolve todos os segmentos e independe do passo', () => {
  const trajetoria = prepararTrajetoria3D(criarTrajetoriaLooping({ raio: 2, alturaInicial: 6, profundidade: 3 }));
  const configuracao = { ...base, velocidadeInicial: 1000 };
  const normal = executar(trajetoria, configuracao).atual;
  const fino = executar(trajetoria, configuracao, 1 / 1000).atual;
  const unico = executar(trajetoria, configuracao, 1).atual;
  assert.equal(normal.estado, 'concluido');
  perto(normal.tempo, fino.tempo, 1e-10);
  perto(normal.tempo, unico.tempo, 1e-10);
  perto(normal.velocidade, Math.sqrt(1000 ** 2 + 2 * base.gravidade * 6));
});

test('gravidade zero mantém velocidade ao longo da curva espacial', () => {
  const trajetoria = prepararTrajetoria3D([ponto(0, 3), ponto(1, 5, 2), ponto(4, -10, 5)]);
  const configuracao = { ...base, gravidade: 0, velocidadeInicial: 7 };
  const resultado = executar(trajetoria, configuracao).atual;
  perto(resultado.tempo, trajetoria.comprimentoTotal / 7);
  perto(resultado.velocidade, 7);
  perto(resultado.energiaPotencial, 0);
});

test('repouso sem força tangencial não avança o relógio e estados finais são estáveis', () => {
  const trajetoria = prepararTrajetoria3D([ponto(0, 0), ponto(1, 0)]);
  const inicial = criarEstadoLooping(trajetoria, base);
  assert.equal(avancarLooping(trajetoria, base, inicial, 0), inicial);
  const parado = avancarLooping(trajetoria, base, inicial, 1);
  assert.equal(parado.estado, 'repouso');
  assert.equal(parado.tempo, 0);
  assert.equal(avancarLooping(trajetoria, base, parado, 1), parado);
});

test('coordenadas, dimensões, parâmetros e intervalos inválidos são rejeitados', () => {
  assert.throws(() => prepararTrajetoria3D([ponto(0, 0), ponto(0, 0)]), /dois pontos/);
  for (const invalido of [NaN, Infinity, -Infinity]) {
    for (const coordenada of ['x', 'y', 'z']) {
      assert.throws(() => prepararTrajetoria3D([ponto(0, 0), { ...ponto(1, 1), [coordenada]: invalido }]), /finitas/);
    }
    for (const parametro of ['raio', 'alturaInicial', 'profundidade']) {
      assert.throws(() => criarTrajetoriaLooping({ raio: 2, alturaInicial: 6, profundidade: 3, [parametro]: invalido }));
    }
  }
  const trajetoria = prepararTrajetoria3D([ponto(0, 1), ponto(1, 0)]);
  for (const parametro of ['massa', 'gravidade', 'velocidadeInicial']) {
    for (const invalido of [NaN, Infinity, -Infinity]) {
      assert.throws(() => criarEstadoLooping(trajetoria, { ...base, [parametro]: invalido }));
    }
  }
  assert.throws(() => criarEstadoLooping(trajetoria, { ...base, massa: 0 }));
  assert.throws(() => criarEstadoLooping(trajetoria, { ...base, gravidade: -1 }));
  assert.throws(() => criarEstadoLooping(trajetoria, { ...base, velocidadeInicial: 1e308 }));
  assert.throws(() => criarEstadoLooping(trajetoria, { ...base, massa: 1e308 }));
  const inicial = criarEstadoLooping(trajetoria, base);
  for (const invalido of [-1, Infinity, NaN]) assert.throws(() => avancarLooping(trajetoria, base, inicial, invalido));
  assert.throws(() => posicaoNaTrajetoria3D(trajetoria, -1));
  assert.throws(() => posicaoNaTrajetoria3D(trajetoria, Infinity));
});
