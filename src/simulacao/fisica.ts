import type { EstadoParticula } from "../tipos/Particula";
import type { ConfiguracaoSimulacao } from "../tipos/ConfiguracaoSimulacao";
import type { ModeloCurva } from "../tipos/ModeloCurva";
import type { GrandezasFisicas } from "../tipos/EstadoSimulacao";
import { converterMundoParaTela } from "./transformacaoCoordenadas";
import type { DadosTrajetoria } from "./gerarTrajetoria";

interface EntradaFisica {
  funcao: ModeloCurva;
  trajetoria: DadosTrajetoria;
  configuracao: ConfiguracaoSimulacao;
  anterior: EstadoParticula;
  tempoDecorrido: number;
}

interface SaidaFisica {
  particula: EstadoParticula;
  metricas: GrandezasFisicas;
  chegou: boolean;
  parou: boolean;
  /** Duração física até o estado retornado, inclusive eventos dentro do passo. */
  tempoIntegrado: number;
}

interface EstadoIntegracao {
  x: number;
  velocidade: number;
}

export function criarParticulaInicial(
  funcao: ModeloCurva,
  trajetoria: DadosTrajetoria,
  velocidadeInicial = 0,
): EstadoParticula {
  const inicio = trajetoria.inicio;
  return {
    x: inicio.x,
    y: inicio.y,
    telaX: inicio.telaX,
    telaY: inicio.telaY,
    angulo: converterInclinacaoParaGraus(calcularDerivada(funcao, inicio.x, {
      minimo: trajetoria.inicio.x,
      maximo: trajetoria.chegada.x,
    })),
    velocidade: velocidadeInicial,
  };
}

/**
 * Partícula confinada a y=f(x), sem energia de rotação ou perda de contato.
 * v é a velocidade tangencial com sinal; dx/dt = v / sqrt(1 + f'(x)²).
 * Resistência adotada: μmg cosθ, sem a contribuição da curvatura à normal.
 * RK4 com refinamento interno integra posição e velocidade; a energia vem do estado.
 */
export function simularFisica({
  funcao,
  trajetoria,
  configuracao,
  anterior,
  tempoDecorrido,
}: EntradaFisica): SaidaFisica {
  if (!Number.isFinite(tempoDecorrido) || tempoDecorrido < 0) {
    throw new Error("O intervalo de integração deve ser finito e não negativo.");
  }
  if (tempoDecorrido === 0) {
    const metricas = criarMetricas(anterior, configuracao);
    return { particula: anterior, metricas, chegou: false, parou: false, tempoIntegrado: 0 };
  }

  const proximo = evoluirAteEvento(funcao, configuracao, anterior, tempoDecorrido);
  const particula = posicionarParticula(
    funcao,
    trajetoria,
    configuracao,
    proximo.x,
    proximo.velocidade,
  );
  const metricas = criarMetricas(particula, configuracao);
  return {
    particula, metricas,
    chegou: proximo.chegou, parou: proximo.parou, tempoIntegrado: proximo.tempoIntegrado,
  };
}

interface Evolucao extends EstadoIntegracao {
  tempoIntegrado: number;
  chegou: boolean;
  parou: boolean;
}

function evoluirAteEvento(
  funcao: ModeloCurva,
  configuracao: ConfiguracaoSimulacao,
  anterior: { x: number; velocidade: number },
  dt: number,
  inversoes = 0,
): Evolucao {
  if (inversoes > 16) {
    throw new Error("Há muitas inversões em um único passo. Reduza a escala ou suavize a curva.");
  }
  const forcas = calcularForcas(funcao, anterior.x, configuracao);
  const sentido = Math.sign(anterior.velocidade) || Math.sign(forcas.gravidade);
  const { minimo, maximo } = configuracao.dominio;
  const repouso = Math.abs(anterior.velocidade) < 1e-10 &&
    Math.abs(forcas.gravidade) <= forcas.atrito;
  const saiuPeloInicio = anterior.x <= minimo && sentido < 0;
  const saiuPeloFim = anterior.x >= maximo && sentido > 0;
  if (repouso || saiuPeloInicio || saiuPeloFim) {
    return {
      x: anterior.x, velocidade: repouso ? 0 : anterior.velocidade,
      tempoIntegrado: 0, chegou: saiuPeloFim, parou: !saiuPeloFim,
    };
  }

  let duracaoTrecho = dt;
  let proximo = integrar(funcao, configuracao, anterior, dt, sentido);
  const inverteu = anterior.velocidade !== 0 && anterior.velocidade * proximo.velocidade <= 0;
  if (inverteu) {
    // Primeiro encontra o ápice/parada. Cada trecho mantém um sentido de atrito.
    let inicio = 0;
    let fim = dt;
    for (let i = 0; i < 36; i += 1) {
      const meio = (inicio + fim) / 2;
      if (integrar(funcao, configuracao, anterior, meio, sentido).velocidade * anterior.velocidade > 0) inicio = meio;
      else fim = meio;
    }
    duracaoTrecho = ajustarDuracao((inicio + fim) / 2, dt);
    proximo = integrar(funcao, configuracao, anterior, duracaoTrecho, sentido);
    proximo.velocidade = 0;
  }

  // Verifica a fronteira antes de continuar após uma inversão. A fronteira
  // encerra a observação e não representa uma colisão nem zera a velocidade.
  const chegou = proximo.x >= maximo;
  const voltou = proximo.x <= minimo && sentido < 0;
  if (chegou || voltou) {
    const limite = chegou ? maximo : minimo;
    let inicio = 0;
    let fim = duracaoTrecho;
    for (let i = 0; i < 36; i += 1) {
      const meio = (inicio + fim) / 2;
      const candidato = integrar(funcao, configuracao, anterior, meio, sentido);
      if (chegou ? candidato.x >= limite : candidato.x <= limite) fim = meio;
      else inicio = meio;
    }
    const tempoIntegrado = ajustarDuracao((inicio + fim) / 2, dt);
    const fronteira = integrar(funcao, configuracao, anterior, tempoIntegrado, sentido);
    return { ...fronteira, x: limite, tempoIntegrado, chegou, parou: !chegou };
  }

  if (inverteu) {
    const forcasParada = calcularForcas(funcao, proximo.x, configuracao);
    if (Math.abs(forcasParada.gravidade) <= forcasParada.atrito) {
      return { ...proximo, tempoIntegrado: duracaoTrecho, chegou: false, parou: true };
    }
    if (duracaoTrecho < dt) {
      const restante = evoluirAteEvento(funcao, configuracao, proximo, dt - duracaoTrecho, inversoes + 1);
      return {
        ...restante,
        tempoIntegrado: ajustarDuracao(duracaoTrecho + restante.tempoIntegrado, dt),
      };
    }
  }
  // v=0 no ápice não é equilíbrio: a gravidade pode iniciar o retorno.
  return { ...proximo, tempoIntegrado: dt, chegou: false, parou: false };
}

function ajustarDuracao(tempo: number, dt: number) {
  return dt - tempo <= dt * 1e-9 ? dt : tempo;
}

function calcularForcas(funcao: ModeloCurva, x: number, configuracao: ConfiguracaoSimulacao) {
  const inclinacao = calcularDerivada(funcao, x, configuracao.dominio);
  const fatorArco = Math.hypot(1, inclinacao);
  return {
    fatorArco,
    gravidade: -configuracao.gravidade * inclinacao / fatorArco,
    atrito: configuracao.coeficienteAtrito * configuracao.gravidade / fatorArco,
  };
}

/** Refina internamente o RK4 sem alterar a cadência de observação de 120 Hz. */
function integrar(
  funcao: ModeloCurva,
  configuracao: ConfiguracaoSimulacao,
  anterior: { x: number; velocidade: number },
  dt: number,
  sentidoAtrito: number,
): EstadoIntegracao {
  // Além da estimativa de erro, limita o deslocamento para evitar saltar
  // detalhes da curva quando a velocidade é grande.
  const limiteDeslocamento = Math.min(0.05, (configuracao.dominio.maximo - configuracao.dominio.minimo) / 128);
  const limitarX = (x: number) => Math.min(configuracao.dominio.maximo, Math.max(configuracao.dominio.minimo, x));
  let tentativas = 0;
  function refinar(inicio: { x: number; velocidade: number }, intervalo: number, nivel: number): EstadoIntegracao {
    if (++tentativas > 8192 || nivel > 24) {
      throw new Error("Não foi possível integrar a curva com precisão. Reduza a escala ou suavize a trajetória.");
    }
    const inteiro = integrarRK4(funcao, configuracao, inicio, intervalo, sentidoAtrito);
    const primeira = integrarRK4(funcao, configuracao, inicio, intervalo / 2, sentidoAtrito);
    const segunda = integrarRK4(funcao, configuracao, primeira, intervalo / 2, sentidoAtrito);
    const toleranciaX = 1e-10 + 1e-9 * Math.abs(segunda.x - inicio.x);
    const toleranciaV = 1e-10 + 1e-9 * Math.abs(segunda.velocidade - inicio.velocidade);
    const erroX = Math.abs(segunda.x - inteiro.x) / 15;
    const erroV = Math.abs(segunda.velocidade - inteiro.velocidade) / 15;
    // A extensão externa serve apenas para localizar a fronteira: não precisa
    // de resolução espacial, pois nenhum estado externo chega à interface.
    const deslocamento = Math.abs(limitarX(primeira.x) - limitarX(inicio.x)) +
      Math.abs(limitarX(segunda.x) - limitarX(primeira.x));
    if (deslocamento <= limiteDeslocamento && erroX <= toleranciaX && erroV <= toleranciaV) {
      return segunda;
    }
    const a = refinar(inicio, intervalo / 2, nivel + 1);
    return refinar(a, intervalo / 2, nivel + 1);
  }
  return refinar(anterior, dt, 0);
}

function integrarRK4(
  funcao: ModeloCurva,
  configuracao: ConfiguracaoSimulacao,
  anterior: { x: number; velocidade: number },
  dt: number,
  sentidoAtrito: number,
): EstadoIntegracao {
  const derivar = (x: number, velocidade: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(velocidade)) {
      throw new Error("A integração excedeu a escala numérica. Reduza os parâmetros ou a amplitude da curva.");
    }
    const xLimitado = Math.min(configuracao.dominio.maximo, Math.max(configuracao.dominio.minimo, x));
    const forcas = calcularForcas(funcao, xLimitado, configuracao);
    return {
      x: velocidade / forcas.fatorArco,
      velocidade: forcas.gravidade - sentidoAtrito * forcas.atrito,
    };
  };
  const a = derivar(anterior.x, anterior.velocidade);
  const b = derivar(anterior.x + a.x * dt / 2, anterior.velocidade + a.velocidade * dt / 2);
  const c = derivar(anterior.x + b.x * dt / 2, anterior.velocidade + b.velocidade * dt / 2);
  const d = derivar(anterior.x + c.x * dt, anterior.velocidade + c.velocidade * dt);
  const proximo = {
    x: anterior.x + dt / 6 * (a.x + 2 * b.x + 2 * c.x + d.x),
    velocidade: anterior.velocidade + dt / 6 * (a.velocidade + 2 * b.velocidade + 2 * c.velocidade + d.velocidade),
  };
  if (!Object.values(proximo).every(Number.isFinite)) {
    throw new Error("A integração excedeu a escala numérica. Reduza os parâmetros ou a amplitude da curva.");
  }
  return proximo;
}

export function calcularDerivada(
  funcao: ModeloCurva,
  x: number,
  dominio?: ConfiguracaoSimulacao["dominio"],
) {
  const h = Math.min(1e-4 * Math.max(1, Math.abs(x)), dominio ? (dominio.maximo - dominio.minimo) / 4 : Infinity);
  if (!Number.isFinite(x) || !Number.isFinite(h) || h <= 0) {
    throw new Error("Não foi possível calcular a inclinação neste domínio.");
  }
  let derivada: number;
  if (dominio && x - h < dominio.minimo) {
    derivada = (-3 * calcularComSeguranca(funcao, x) + 4 * calcularComSeguranca(funcao, x + h) -
      calcularComSeguranca(funcao, x + 2 * h)) / (2 * h);
  } else if (dominio && x + h > dominio.maximo) {
    derivada = (3 * calcularComSeguranca(funcao, x) - 4 * calcularComSeguranca(funcao, x - h) +
      calcularComSeguranca(funcao, x - 2 * h)) / (2 * h);
  } else {
    derivada = (calcularComSeguranca(funcao, x + h) - calcularComSeguranca(funcao, x - h)) / (2 * h);
  }
  if (!Number.isFinite(derivada)) {
    throw new Error(`A inclinação da curva excedeu a escala numérica em x = ${x.toPrecision(6)}.`);
  }
  return derivada;
}

function posicionarParticula(
  funcao: ModeloCurva,
  trajetoria: DadosTrajetoria,
  configuracao: ConfiguracaoSimulacao,
  x: number,
  velocidade: number,
): EstadoParticula {
  const y = calcularComSeguranca(funcao, x);
  const tela = converterMundoParaTela(x, y, trajetoria.limites, configuracao);
  return {
    x,
    y,
    telaX: tela.x,
    telaY: tela.y,
    angulo: converterInclinacaoParaGraus(calcularDerivada(funcao, x, configuracao.dominio)),
    velocidade,
  };
}

function converterInclinacaoParaGraus(inclinacao: number) {
  return Math.atan(inclinacao) * (180 / Math.PI);
}

export function criarMetricas(particula: EstadoParticula, configuracao: ConfiguracaoSimulacao): GrandezasFisicas {
  const energiaPotencial = configuracao.massa * configuracao.gravidade * particula.y;
  const energiaCinetica = 0.5 * configuracao.massa * particula.velocidade ** 2;
  const metricas = {
    velocidade: particula.velocidade,
    altura: particula.y,
    energiaCinetica,
    energiaPotencial,
    energiaTotal: energiaCinetica + energiaPotencial,
  };
  if (![...Object.values(particula), ...Object.values(metricas)].every(Number.isFinite)) {
    throw new Error("O estado ou a energia excedeu a escala numérica. Reduza os parâmetros ou a amplitude da curva.");
  }
  return metricas;
}

function calcularComSeguranca(funcao: ModeloCurva, x: number) {
  const y = funcao.calcular(x);
  if (!Number.isFinite(y)) {
    throw new Error(`A curva não tem um valor finito em x = ${x.toPrecision(6)}.`);
  }
  return y;
}
