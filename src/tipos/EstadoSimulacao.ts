export type EstadoSimulacao = "PRONTO" | "EM_EXECUCAO" | "PAUSADO" | "LIMITE_FINAL" | "ENCERRADO";

export interface GrandezasFisicas {
  velocidade: number;
  altura: number;
  energiaCinetica: number;
  energiaPotencial: number;
  energiaTotal: number;
}

export interface AmostraSimulacao {
  tempo: number;
  x: number;
  velocidade: number;
  altura: number;
  energiaCinetica: number;
  energiaPotencial: number;
  energiaTotal: number;
}
