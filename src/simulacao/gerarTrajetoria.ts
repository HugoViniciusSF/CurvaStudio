import type { ModeloCurva } from "../tipos/ModeloCurva";
import type { ConfiguracaoSimulacao } from "../tipos/ConfiguracaoSimulacao";
import { converterMundoParaTela } from "./transformacaoCoordenadas";

export interface PontoTrajetoria {
  x: number;
  y: number;
  telaX: number;
  telaY: number;
}

export interface LimitesTrajetoria {
  minimoY: number;
  maximoY: number;
}

export interface DadosTrajetoria {
  pontos: PontoTrajetoria[];
  caminho: string;
  limites: LimitesTrajetoria;
  inicio: PontoTrajetoria;
  chegada: PontoTrajetoria;
}

export function gerarTrajetoria(funcao: ModeloCurva, configuracao: ConfiguracaoSimulacao): DadosTrajetoria {
  const pontosBrutos = amostrarFuncao(funcao, configuracao);
  const valoresY = pontosBrutos.map((ponto) => ponto.y);
  const minimoY = Math.min(...valoresY);
  const maximoY = Math.max(...valoresY);
  const folgaY = Math.max((maximoY - minimoY) * 0.18, 0.8);
  const limites = {
    minimoY: minimoY - folgaY,
    maximoY: maximoY + folgaY,
  };

  if (!Number.isFinite(limites.minimoY) || !Number.isFinite(limites.maximoY)
    || !Number.isFinite(limites.maximoY - limites.minimoY)) {
    throw new Error("Os valores da função excedem a escala numérica do gráfico. Reduza o domínio ou a amplitude.");
  }

  const pontos = pontosBrutos.map((ponto) => {
    const tela = converterMundoParaTela(ponto.x, ponto.y, limites, configuracao);

    if (!Number.isFinite(tela.x) || !Number.isFinite(tela.y)) {
      throw new Error("Não foi possível representar a curva nessa escala.");
    }

    return {
      ...ponto,
      telaX: tela.x,
      telaY: tela.y,
    };
  });

  const caminho = criarCaminho(pontos);

  return {
    pontos,
    caminho,
    limites,
    inicio: pontos[0],
    chegada: pontos[pontos.length - 1],
  };
}

function criarCaminho(pontos: PontoTrajetoria[]) {
  return pontos.map((ponto, indice) =>
    `${indice === 0 ? "M" : "L"} ${ponto.telaX.toFixed(3)} ${ponto.telaY.toFixed(3)}`,
  ).join(" ");
}

function amostrarFuncao(funcao: ModeloCurva, configuracao: ConfiguracaoSimulacao) {
  const pontos: Array<{ x: number; y: number }> = [];
  const { dominio, quantidadeAmostras } = configuracao;

  if (!Number.isFinite(dominio.minimo) || !Number.isFinite(dominio.maximo)
    || dominio.minimo >= dominio.maximo || !Number.isFinite(dominio.maximo - dominio.minimo)) {
    throw new Error("O domínio deve ter limites finitos, com mínimo menor que máximo.");
  }

  if (!Number.isInteger(quantidadeAmostras) || quantidadeAmostras < 2) {
    throw new Error("A curva precisa de pelo menos duas amostras.");
  }

  const passo = (dominio.maximo - dominio.minimo) / (quantidadeAmostras - 1);

  for (let indice = 0; indice < quantidadeAmostras; indice += 1) {
    const x = indice === quantidadeAmostras - 1 ? dominio.maximo : dominio.minimo + passo * indice;
    let y: number;

    try {
      y = funcao.calcular(x);
      if (!Number.isFinite(y)) throw new Error("Resultado não finito.");
    } catch {
      const coordenada = Number(x.toPrecision(8)).toLocaleString("pt-BR", { maximumSignificantDigits: 8 });
      throw new Error(`A curva não está definida em x = ${coordenada}. Ajuste a expressão ou o domínio.`);
    }

    pontos.push({
      x,
      y,
    });
  }

  return pontos;
}
