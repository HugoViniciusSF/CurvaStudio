import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const compilado = await build({
  stdin: { contents: `export * from './src/simulacao/looping3d.ts';
    export { primeiraPerdaDeContato } from './src/simulacao/contatoLooping3d.ts';`,
  resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
});
const {
  criarTrajetoriaLooping, prepararTrajetoria3D, criarEstadoLooping, avancarLooping,
  estadoNoDesprendimento, limiteObservacaoLooping, duracaoVooLooping, primeiraPerdaDeContato,
} = await import(`data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString('base64')}`);

const base = { massa: 2, gravidade: 9.81, velocidadeInicial: 0, modoContato: 'solta' };
const terminal = estado => ['concluido', 'retornou', 'repouso', 'queda_encerrada'].includes(estado.estado);
const percurso = (alturaInicial, raio = 1, profundidade = 0) => prepararTrajetoria3D(
  criarTrajetoriaLooping({ raio, alturaInicial, profundidade }));
function perto(atual, esperado, tolerancia = 1e-8) {
  assert.ok(Math.abs(atual - esperado) <= tolerancia, `${atual} deve estar a até ${tolerancia} de ${esperado}`);
}
function executar(trajetoria, configuracao = base, dt = 1 / 120) {
  const inicial = criarEstadoLooping(trajetoria, configuracao);
  let atual = inicial;
  let passos = 0;
  while (!terminal(atual) && passos++ < 20000) {
    atual = avancarLooping(trajetoria, configuracao, atual, dt);
    perto(atual.energiaMecanica, inicial.energiaMecanica, Math.max(1e-8, Math.abs(inicial.energiaMecanica) * 1e-11));
    perto(Math.hypot(...Object.values(atual.velocidadeVetor)), Math.abs(atual.velocidade), 1e-8);
  }
  assert.ok(passos < 20000, 'a simulação precisa alcançar um estado terminal');
  return atual;
}

test('R=1,H=2,4 completa presa e desprende solta antes do topo', () => {
  const traj = percurso(2.4);
  assert.equal(executar(traj, { ...base, modoContato: 'presa' }).estado, 'concluido');
  const resultado = executar(traj);
  assert.equal(resultado.estado, 'queda_encerrada');
  const evento = resultado.desprendimento;
  assert.ok(evento.posicao.y < 2);
  // Solução independente N=mg(2H/R−2+3cosθ)=0 e conservação de energia.
  const cosseno = -(2 * 2.4 - 2) / 3;
  const x = Math.sqrt(1 - cosseno ** 2);
  const y = 1 - cosseno;
  const rapidez = Math.sqrt(2 * base.gravidade * (2.4 - y));
  perto(evento.posicao.x, x, 1e-4);
  perto(evento.posicao.y, y, 1e-4);
  perto(evento.velocidade.x, rapidez * cosseno, 1e-4);
  perto(evento.velocidade.y, rapidez * x, 1e-4);
  assert.ok(y + evento.velocidade.y ** 2 / (2 * base.gravidade) < 2,
    'o voo deste cenário também não alcança a altura do topo');
});

test('o limiar 2,5R distingue alturas a menos de 0,0001R e não confunde N=0 com desprendimento', () => {
  for (const raio of [0.25, 1, 5]) {
    assert.equal(executar(percurso(2.49995 * raio, raio)).estado, 'queda_encerrada');
    assert.equal(executar(percurso(2.5 * raio, raio)).estado, 'concluido');
    assert.equal(executar(percurso(2.6 * raio, raio)).estado, 'concluido');
  }
});

test('N no topo é negativa na guia presa abaixo do limiar e zero em 2,5R', () => {
  for (const altura of [2.4, 2.5, 2.6]) {
    const traj = percurso(altura);
    const configuracao = { ...base, modoContato: 'presa' };
    const distancia = traj.comprimentosAcumulados[480];
    const velocidade = Math.sqrt(2 * base.gravidade * (altura - 2));
    const anterior = { ...criarEstadoLooping(traj, configuracao), distancia, velocidade, estado: 'em_movimento' };
    const noTopo = avancarLooping(traj, configuracao, anterior, Number.EPSILON);
    perto(noTopo.forcaNormal, base.massa * (velocidade ** 2 - base.gravidade), 1e-7);
  }
});

test('velocidade inicial conta na altura energética e massa não altera desprendimento', () => {
  const traj = percurso(2.4);
  const limiar = Math.sqrt(2 * base.gravidade * 0.1);
  assert.equal(executar(traj, { ...base, velocidadeInicial: limiar }).estado, 'concluido');
  assert.equal(executar(traj, { ...base, velocidadeInicial: limiar - 0.001 }).estado, 'queda_encerrada');
  const leve = executar(traj);
  const pesada = executar(traj, { ...base, massa: 200 });
  assert.deepEqual(leve.desprendimento, pesada.desprendimento);
  perto(pesada.energiaMecanica, leve.energiaMecanica * 100);
});

test('instante de saída independe do passo e grandes passos não saltam a perda de contato', () => {
  const traj = percurso(2.4);
  const fino = executar(traj, base, 1 / 1000);
  for (const dt of [1 / 120, 1, 100]) {
    const resultado = executar(traj, base, dt);
    perto(resultado.desprendimento.tempo, fino.desprendimento.tempo, 1e-10);
    perto(resultado.desprendimento.distancia, fino.desprendimento.distancia, 1e-10);
    perto(resultado.tempo, fino.tempo, 1e-10);
    perto(resultado.posicao.y, limiteObservacaoLooping(traj), 1e-10);
  }
});

test('uma região negativa estreita inteiramente interna ao segmento também desprende', () => {
  const geometria = {
    tangentes: [{ x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
    normais: [{ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }],
    curvaturas: [{ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }],
  };
  // N/m = (2−2u)(−u)+0,49999: positivo nos extremos, negativo perto de u=0,5.
  const raiz = 0.5 - Math.sqrt(0.000005);
  perto(primeiraPerdaDeContato(geometria, 0, 0, 1, 2, -2, 0.49999), raiz, 1e-10);
  perto(primeiraPerdaDeContato(geometria, 0, 1, 0, 2, -2, 0.49999), 1 - raiz, 1e-10);
  assert.equal(primeiraPerdaDeContato(geometria, 0, 0, 1, 2, -2, 0.5), null);
});

test('voo preserva posição e vetor velocidade no evento e segue a solução balística em xyz', () => {
  const traj = percurso(2.4, 1, 0.8);
  const final = executar(traj);
  const saida = estadoNoDesprendimento(final, base);
  assert.ok(saida);
  assert.deepEqual(saida.posicao, final.desprendimento.posicao);
  assert.deepEqual(saida.velocidadeVetor, final.desprendimento.velocidade);
  assert.equal(saida.forcaNormal, 0);
  assert.ok(Math.abs(saida.velocidadeVetor.z) > 0.01);
  const dt = 0.1;
  const voo = avancarLooping(traj, base, saida, dt);
  perto(voo.posicao.x, saida.posicao.x + saida.velocidadeVetor.x * dt);
  perto(voo.posicao.y, saida.posicao.y + saida.velocidadeVetor.y * dt - base.gravidade * dt ** 2 / 2);
  perto(voo.posicao.z, saida.posicao.z + saida.velocidadeVetor.z * dt);
  perto(voo.velocidadeVetor.y, saida.velocidadeVetor.y - base.gravidade * dt);
  perto(voo.energiaCinetica, base.massa * (voo.velocidadeVetor.x ** 2 + voo.velocidadeVetor.y ** 2 + voo.velocidadeVetor.z ** 2) / 2);
  perto(voo.energiaMecanica, saida.energiaMecanica);
  assert.equal(voo.distancia, saida.distancia, 's registra a última posição na pista durante o voo');
  assert.equal(voo.estado, 'desprendida');
  assert.equal(avancarLooping(traj, base, final, 100), final);
});

test('profundidade altera a condição de contato e não reutiliza cegamente o limite planar', () => {
  assert.equal(executar(percurso(2.5, 1, 1)).estado, 'queda_encerrada');
  assert.equal(executar(percurso(3, 1, 1)).estado, 'concluido');
});

test('gravidade zero usa voo retilíneo com horizonte explícito de cinco segundos', () => {
  const traj = prepararTrajetoria3D([{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }, { x: 2, y: 0, z: 2 }]);
  const configuracao = { ...base, gravidade: 0, velocidadeInicial: 3 };
  const final = executar(traj, configuracao, 10);
  assert.equal(final.estado, 'queda_encerrada');
  const evento = final.desprendimento;
  assert.equal(duracaoVooLooping(traj, configuracao, evento), 5);
  perto(final.tempo, evento.tempo + 5);
  for (const eixo of ['x', 'y', 'z']) {
    perto(final.posicao[eixo], evento.posicao[eixo] + evento.velocidade[eixo] * 5);
    perto(final.velocidadeVetor[eixo], evento.velocidade[eixo]);
  }
});

test('retorno de baixa energia mantém a orientação do apoio e configuração inválida é rejeitada', () => {
  const traj = percurso(0.6);
  assert.equal(executar(traj).estado, 'retornou');
  assert.equal(estadoNoDesprendimento(criarEstadoLooping(traj, base), base), null);
  assert.throws(() => criarEstadoLooping(traj, { ...base, modoContato: 'invalido' }), /modo de contato/);
});
