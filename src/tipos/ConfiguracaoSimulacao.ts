export interface ConfiguracaoSimulacao {
  largura: number;
  altura: number;
  margem: {
    topo: number;
    direita: number;
    baixo: number;
    esquerda: number;
  };
  dominio: {
    minimo: number;
    maximo: number;
  };
  quantidadeAmostras: number;
  gravidade: number;
  massa: number;
  velocidadeInicial: number;
  coeficienteAtrito: number;
}
