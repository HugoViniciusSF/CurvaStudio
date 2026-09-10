import type { ConfiguracaoSimulacao } from "../tipos/ConfiguracaoSimulacao";

export const RITMOS_REPRODUCAO: readonly number[] = [
  0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30,
];

export const configuracaoPadrao: ConfiguracaoSimulacao = {
  largura: 1000,
  altura: 460,
  margem: {
    topo: 44,
    direita: 72,
    baixo: 64,
    esquerda: 72,
  },
  dominio: {
    minimo: -5,
    maximo: 5,
  },
  quantidadeAmostras: 220,
  gravidade: 9.81,
  massa: 12,
  velocidadeInicial: 8.6,
  coeficienteAtrito: 0.035,
};
