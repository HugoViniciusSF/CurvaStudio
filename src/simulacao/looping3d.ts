import {
  contatoNoSegmento, escalar, prepararGeometriaContato, primeiraPerdaDeContato,
  type GeometriaContato3D,
} from './contatoLooping3d';

export interface Ponto3D {
  x: number;
  y: number;
  z: number;
}

export interface Trajetoria3D {
  pontos: Ponto3D[];
  comprimentosAcumulados: number[];
  comprimentoTotal: number;
  geometriaContato: GeometriaContato3D;
}

export interface ConfiguracaoLooping {
  massa: number;
  gravidade: number;
  velocidadeInicial: number;
  modoContato?: 'presa' | 'solta';
}

export interface ParametrosLooping {
  raio: number;
  alturaInicial: number;
  profundidade: number;
}

export interface DesprendimentoLooping {
  tempo: number;
  distancia: number;
  posicao: Ponto3D;
  velocidade: Ponto3D;
}

export interface EstadoLooping {
  tempo: number;
  distancia: number;
  velocidade: number;
  posicao: Ponto3D;
  energiaCinetica: number;
  energiaPotencial: number;
  energiaMecanica: number;
  velocidadeVetor: Ponto3D;
  forcaNormal: number;
  desprendimento?: DesprendimentoLooping;
  estado: 'pronto' | 'em_movimento' | 'concluido' | 'retornou' | 'repouso' | 'desprendida' | 'queda_encerrada';
}

function exigirFinitos(valores: number[], mensagem: string) {
  if (!valores.every(Number.isFinite)) throw new Error(mensagem);
}

function validarConfiguracao(configuracao: ConfiguracaoLooping) {
  const { massa, gravidade, velocidadeInicial } = configuracao;
  exigirFinitos([massa, gravidade, velocidadeInicial, velocidadeInicial ** 2],
    'Os parâmetros físicos devem estar dentro da escala numérica.');
  if (massa <= 0 || gravidade < 0) {
    throw new Error('Use massa positiva e gravidade maior ou igual a zero.');
  }
  if (configuracao.modoContato !== undefined && !['presa', 'solta'].includes(configuracao.modoContato)) {
    throw new Error('O modo de contato deve ser presa ou solta.');
  }
}

/** Uma única curva espacial ordenada: duas passagens com o mesmo x,y mantêm seu lugar no percurso. */
export function criarTrajetoriaLooping({ raio, alturaInicial, profundidade }: ParametrosLooping): Ponto3D[] {
  exigirFinitos([raio, alturaInicial, profundidade], 'As dimensões do looping devem ser finitas.');
  if (raio <= 0 || alturaInicial < 0 || profundidade < 0) {
    throw new Error('Use raio positivo, altura inicial e profundidade maiores ou iguais a zero.');
  }
  const pontos: Ponto3D[] = [];
  for (let indice = 0; indice <= 120; indice++) {
    const t = indice / 120;
    pontos.push({ x: indice === 120 ? 0 : -3 * raio * (1 - t), y: alturaInicial * (1 - t) ** 2, z: 0 });
  }
  for (let indice = 1; indice <= 720; indice++) {
    const t = indice / 720;
    const angulo = 2 * Math.PI * t;
    pontos.push({
      x: indice === 720 ? 0 : raio * Math.sin(angulo),
      y: indice === 720 ? 0 : raio * (1 - Math.cos(angulo)),
      z: profundidade * t ** 2 * (3 - 2 * t),
    });
  }
  for (let indice = 1; indice <= 120; indice++) {
    pontos.push({ x: 3 * raio * indice / 120, y: 0, z: profundidade });
  }
  exigirFinitos(pontos.flatMap(ponto => [ponto.x, ponto.y, ponto.z]),
    'As dimensões do looping excedem a escala numérica.');
  return pontos;
}

export function prepararTrajetoria3D(entrada: readonly Ponto3D[]): Trajetoria3D {
  const pontos: Ponto3D[] = [];
  const comprimentosAcumulados: number[] = [];
  let comprimentoTotal = 0;
  for (const ponto of entrada) {
    exigirFinitos([ponto.x, ponto.y, ponto.z], 'Cada ponto precisa de coordenadas x, y e z finitas.');
    const anterior = pontos.at(-1);
    if (anterior) {
      const comprimento = Math.hypot(ponto.x - anterior.x, ponto.y - anterior.y, ponto.z - anterior.z);
      if (comprimento === 0) continue;
      const acumulado = comprimentoTotal + comprimento;
      if (!Number.isFinite(acumulado) || acumulado <= comprimentoTotal) {
        throw new Error('O comprimento da trajetória excede a precisão numérica.');
      }
      comprimentoTotal = acumulado;
    }
    pontos.push({ ...ponto });
    comprimentosAcumulados.push(comprimentoTotal);
  }
  if (pontos.length < 2) throw new Error('Desenhe pelo menos dois pontos distintos para criar uma trajetória.');
  return { pontos, comprimentosAcumulados, comprimentoTotal,
    geometriaContato: prepararGeometriaContato(pontos, comprimentosAcumulados) };
}

// Em um vértice, o segmento escolhido pertence ao sentido do movimento.
// Isso impede a troca de ramo nas interseções, mesmo com profundidade zero.
function indiceSegmento(trajetoria: Trajetoria3D, distancia: number, sentido: number): number {
  const acumulados = trajetoria.comprimentosAcumulados;
  let inicio = 0;
  let fim = acumulados.length;
  while (inicio < fim) {
    const meio = Math.floor((inicio + fim) / 2);
    if (acumulados[meio] < distancia || (sentido >= 0 && acumulados[meio] === distancia)) inicio = meio + 1;
    else fim = meio;
  }
  return Math.max(0, Math.min(acumulados.length - 2, inicio - 1));
}

export function posicaoNaTrajetoria3D(trajetoria: Trajetoria3D, distancia: number): Ponto3D {
  if (!Number.isFinite(distancia) || distancia < 0 || distancia > trajetoria.comprimentoTotal) {
    throw new Error('A distância deve pertencer à trajetória.');
  }
  const indice = indiceSegmento(trajetoria, distancia, 1);
  const inicio = trajetoria.pontos[indice];
  const fim = trajetoria.pontos[indice + 1];
  const acumulados = trajetoria.comprimentosAcumulados;
  const fracao = (distancia - acumulados[indice]) / (acumulados[indice + 1] - acumulados[indice]);
  return {
    x: inicio.x + (fim.x - inicio.x) * fracao,
    y: inicio.y + (fim.y - inicio.y) * fracao,
    z: inicio.z + (fim.z - inicio.z) * fracao,
  };
}

function aceleracaoNoSegmento(trajetoria: Trajetoria3D, gravidade: number, indice: number): number {
  const dy = trajetoria.pontos[indice + 1].y - trajetoria.pontos[indice].y;
  const ds = trajetoria.comprimentosAcumulados[indice + 1] - trajetoria.comprimentosAcumulados[indice];
  return -gravidade * (dy / ds);
}

function montarEstado(
  trajetoria: Trajetoria3D,
  configuracao: ConfiguracaoLooping,
  tempo: number,
  distancia: number,
  velocidade: number,
  estado: EstadoLooping['estado'],
): EstadoLooping {
  const posicao = posicaoNaTrajetoria3D(trajetoria, distancia);
  const energiaCinetica = configuracao.massa * (velocidade ** 2 / 2);
  const energiaPotencial = configuracao.massa * (configuracao.gravidade * posicao.y);
  const energiaMecanica = energiaCinetica + energiaPotencial;
  const indice = indiceSegmento(trajetoria, distancia, velocidade || 1);
  const acumulados = trajetoria.comprimentosAcumulados;
  const fracao = (distancia - acumulados[indice]) / (acumulados[indice + 1] - acumulados[indice]);
  const contato = contatoNoSegmento(trajetoria.geometriaContato, indice, fracao, velocidade ** 2, configuracao.gravidade);
  const velocidadeVetor = escalar(contato.tangente, velocidade);
  const forcaNormal = configuracao.massa * contato.aceleracaoNormal;
  exigirFinitos([tempo, distancia, velocidade, energiaCinetica, energiaPotencial, energiaMecanica, forcaNormal,
    velocidadeVetor.x, velocidadeVetor.y, velocidadeVetor.z],
    'O estado ou as energias excedem a escala numérica.');
  return { tempo, distancia, velocidade, posicao, energiaCinetica, energiaPotencial, energiaMecanica,
    estado, velocidadeVetor, forcaNormal };
}

/** Plano inferior de observação: encerrar o voo não representa impacto ou colisão. */
export function limiteObservacaoLooping(trajetoria: Trajetoria3D): number {
  let minimo = Infinity;
  let maximo = -Infinity;
  for (const ponto of trajetoria.pontos) { minimo = Math.min(minimo, ponto.y); maximo = Math.max(maximo, ponto.y); }
  return minimo - Math.max(2, (maximo - minimo) * 0.5);
}

export function duracaoVooLooping(trajetoria: Trajetoria3D, configuracao: ConfiguracaoLooping, evento: DesprendimentoLooping): number {
  if (configuracao.gravidade === 0) return 5;
  const altura = evento.posicao.y - limiteObservacaoLooping(trajetoria);
  const vy = evento.velocidade.y;
  const raiz = Math.hypot(vy, Math.sqrt(2 * configuracao.gravidade * altura));
  return vy >= 0 ? (vy + raiz) / configuracao.gravidade : 2 * altura / (raiz - vy);
}

export function posicaoNoVooLooping(evento: DesprendimentoLooping, gravidade: number, duracao: number): Ponto3D {
  return { x: evento.posicao.x + evento.velocidade.x * duracao,
    y: evento.posicao.y + evento.velocidade.y * duracao - gravidade * duracao ** 2 / 2,
    z: evento.posicao.z + evento.velocidade.z * duracao };
}

function montarEstadoVoo(configuracao: ConfiguracaoLooping, evento: DesprendimentoLooping, duracao: number, encerrado: boolean): EstadoLooping {
  const posicao = posicaoNoVooLooping(evento, configuracao.gravidade, duracao);
  const velocidadeVetor = { ...evento.velocidade, y: evento.velocidade.y - configuracao.gravidade * duracao };
  const velocidade = Math.hypot(velocidadeVetor.x, velocidadeVetor.y, velocidadeVetor.z);
  const energiaCinetica = configuracao.massa * velocidade ** 2 / 2;
  const energiaPotencial = configuracao.massa * configuracao.gravidade * posicao.y;
  const energiaMecanica = energiaCinetica + energiaPotencial;
  const tempo = evento.tempo + duracao;
  exigirFinitos([tempo, posicao.x, posicao.y, posicao.z, velocidade, energiaCinetica, energiaPotencial, energiaMecanica],
    'O voo ou as energias excedem a escala numérica.');
  return { tempo, distancia: evento.distancia, velocidade, posicao, energiaCinetica, energiaPotencial,
    energiaMecanica, velocidadeVetor, forcaNormal: 0, desprendimento: evento,
    estado: encerrado ? 'queda_encerrada' : 'desprendida' };
}

/** Reconstrói a amostra do instante exato de saída, mesmo quando o passo terminou já em voo. */
export function estadoNoDesprendimento(estado: EstadoLooping, configuracao: ConfiguracaoLooping): EstadoLooping | null {
  return estado.desprendimento ? montarEstadoVoo(configuracao, estado.desprendimento, 0, false) : null;
}

function avancarVoo(trajetoria: Trajetoria3D, configuracao: ConfiguracaoLooping, evento: DesprendimentoLooping, tempo: number): EstadoLooping {
  const duracaoMaxima = duracaoVooLooping(trajetoria, configuracao, evento);
  const duracao = Math.min(duracaoMaxima, Math.max(0, tempo - evento.tempo));
  return montarEstadoVoo(configuracao, evento, duracao, duracao >= duracaoMaxima);
}

export function criarEstadoLooping(trajetoria: Trajetoria3D, configuracao: ConfiguracaoLooping): EstadoLooping {
  validarConfiguracao(configuracao);
  return montarEstado(trajetoria, configuracao, 0, 0, configuracao.velocidadeInicial, 'pronto');
}

function velocidadePelaEnergia(
  trajetoria: Trajetoria3D, configuracao: ConfiguracaoLooping, distancia: number, sentido: number,
): number {
  const altura = posicaoNaTrajetoria3D(trajetoria, distancia).y;
  const quadradoInicial = configuracao.velocidadeInicial ** 2;
  const variacao = 2 * configuracao.gravidade * (trajetoria.pontos[0].y - altura);
  const quadrado = quadradoInicial + variacao;
  const tolerancia = 128 * Number.EPSILON * Math.max(1, quadradoInicial, Math.abs(variacao));
  if (!Number.isFinite(quadrado) || quadrado < -tolerancia) {
    throw new Error('A posição calculada está fora do alcance da energia inicial.');
  }
  return sentido * Math.sqrt(Math.max(0, quadrado));
}

/**
 * Guia ideal sem atrito ou rotação. No modo solta, o apoio não pode puxar:
 * o primeiro cruzamento de N para valores negativos inicia voo balístico.
 * A trajetória é poligonal: em cada segmento, a = -g Δy/Δs é constante.
 * A solução s(t)=s0+v0t+at²/2 trata vértices, inversões e fronteiras no
 * instante exato. A reação da guia muda a direção, sem realizar trabalho.
 */
export function avancarLooping(
  trajetoria: Trajetoria3D,
  configuracao: ConfiguracaoLooping,
  anterior: EstadoLooping,
  dt: number,
): EstadoLooping {
  validarConfiguracao(configuracao);
  if (!Number.isFinite(dt) || dt < 0) throw new Error('O intervalo de simulação deve ser finito e não negativo.');
  exigirFinitos([anterior.tempo, anterior.distancia, anterior.velocidade], 'O estado anterior deve ser finito.');
  if (dt === 0 || ['concluido', 'retornou', 'repouso', 'queda_encerrada'].includes(anterior.estado)) return anterior;
  if (anterior.desprendimento) return avancarVoo(trajetoria, configuracao, anterior.desprendimento, anterior.tempo + dt);
  if (anterior.distancia < 0 || anterior.distancia > trajetoria.comprimentoTotal) {
    throw new Error('O estado anterior deve pertencer à trajetória.');
  }
  let distancia = anterior.distancia;
  let velocidade = anterior.velocidade;
  let restante = dt;
  let decorrido = 0;
  let estado: EstadoLooping['estado'] = 'em_movimento';
  let eventos = 0;

  while (restante > 0) {
    if (++eventos > 100_000) throw new Error('O intervalo é grande demais para resolver os eventos da trajetória.');
    let sentido = Math.sign(velocidade);
    if (sentido === 0) {
      const adiante = indiceSegmento(trajetoria, distancia, 1);
      const atras = indiceSegmento(trajetoria, distancia, -1);
      const podeAvancar = distancia < trajetoria.comprimentoTotal && aceleracaoNoSegmento(trajetoria, configuracao.gravidade, adiante) > 0;
      const podeRetornar = distancia > 0 && aceleracaoNoSegmento(trajetoria, configuracao.gravidade, atras) < 0;
      // Em um extremo local com velocidade exatamente nula, mantém-se o
      // equilíbrio. No topo ideal não se escolhe arbitrariamente um lado.
      if (podeAvancar === podeRetornar) {
        estado = 'repouso';
        break;
      }
      sentido = podeAvancar ? 1 : -1;
    }
    if (distancia === 0 && sentido < 0) { estado = 'retornou'; break; }
    if (distancia === trajetoria.comprimentoTotal && sentido > 0) { estado = 'concluido'; break; }

    const indice = indiceSegmento(trajetoria, distancia, sentido);
    const aceleracao = aceleracaoNoSegmento(trajetoria, configuracao.gravidade, indice);
    const indiceFronteira = indice + (sentido > 0 ? 1 : 0);
    const fronteira = trajetoria.comprimentosAcumulados[indiceFronteira];
    const distanciaAteFronteira = Math.abs(fronteira - distancia);
    const rapidez = Math.abs(velocidade);
    const aceleracaoNoSentido = aceleracao * sentido;
    const quadradoInicial = configuracao.velocidadeInicial ** 2;
    const variacaoNaFronteira = 2 * configuracao.gravidade * (trajetoria.pontos[0].y - trajetoria.pontos[indiceFronteira].y);
    const quadradoNaFronteira = quadradoInicial + variacaoNaFronteira;
    exigirFinitos([quadradoNaFronteira], 'A velocidade na fronteira excede a escala numérica.');
    const tempoInversao = aceleracaoNoSentido < 0 ? rapidez / -aceleracaoNoSentido : Infinity;
    const tolerancia = 128 * Number.EPSILON * Math.max(1, quadradoInicial, Math.abs(variacaoNaFronteira));
    const tempoFronteira = quadradoNaFronteira >= -tolerancia
      ? 2 * distanciaAteFronteira / (rapidez + Math.sqrt(Math.max(0, quadradoNaFronteira)))
      : Infinity;
    // A energia decide se a fronteira pode ser alcançada. Comparar somente
    // os tempos arredondados provoca rebotes artificiais quando chegada e
    // inversão coincidem, como no retorno ao ponto inicial com v = 0.
    const inverte = quadradoNaFronteira < -tolerancia;
    const tempoEvento = inverte ? tempoInversao : tempoFronteira;
    if (configuracao.modoContato === 'solta') {
      const duracaoTrecho = Math.min(restante, tempoEvento);
      const acumulados = trajetoria.comprimentosAcumulados;
      const comprimento = acumulados[indice + 1] - acumulados[indice];
      const distanciaFinal = inverte || duracaoTrecho < tempoEvento
        ? distancia + velocidade * duracaoTrecho + aceleracao * duracaoTrecho ** 2 / 2 : fronteira;
      const alturaInicio = trajetoria.pontos[indice].y;
      const dy = trajetoria.pontos[indice + 1].y - alturaInicio;
      const fracao = primeiraPerdaDeContato(trajetoria.geometriaContato, indice,
        Math.max(0, Math.min(1, (distancia - acumulados[indice]) / comprimento)),
        Math.max(0, Math.min(1, (distanciaFinal - acumulados[indice]) / comprimento)),
        quadradoInicial + 2 * configuracao.gravidade * (trajetoria.pontos[0].y - alturaInicio),
        -2 * configuracao.gravidade * dy, configuracao.gravidade);
      if (fracao !== null) {
        const distanciaSaida = acumulados[indice] + comprimento * fracao;
        const velocidadeSaida = velocidadePelaEnergia(trajetoria, configuracao, distanciaSaida, sentido);
        const percurso = Math.abs(distanciaSaida - distancia);
        const duracaoSaida = percurso === 0 ? 0 : 2 * percurso / (rapidez + Math.abs(velocidadeSaida));
        const saida = montarEstado(trajetoria, configuracao, anterior.tempo + decorrido + duracaoSaida,
          distanciaSaida, velocidadeSaida, 'desprendida');
        const evento: DesprendimentoLooping = { tempo: saida.tempo, distancia: saida.distancia,
          posicao: saida.posicao, velocidade: saida.velocidadeVetor };
        return avancarVoo(trajetoria, configuracao, evento, anterior.tempo + dt);
      }
    }
    if (restante < tempoEvento) {
      distancia += velocidade * restante + aceleracao * restante ** 2 / 2;
      velocidade += aceleracao * restante;
      decorrido += restante;
      restante = 0;
    } else {
      decorrido += tempoEvento;
      restante = Math.max(0, restante - tempoEvento);
      if (inverte) {
        distancia += velocidade * tempoEvento + aceleracao * tempoEvento ** 2 / 2;
        velocidade = 0;
      } else {
        distancia = fronteira;
        velocidade = velocidadePelaEnergia(trajetoria, configuracao, distancia, sentido);
        if (distancia === trajetoria.comprimentoTotal) { estado = 'concluido'; break; }
        if (distancia === 0) { estado = 'retornou'; break; }
      }
    }
  }
  if (velocidade !== 0) velocidade = velocidadePelaEnergia(trajetoria, configuracao, distancia, Math.sign(velocidade));
  return montarEstado(trajetoria, configuracao, anterior.tempo + decorrido, distancia, velocidade, estado);
}
