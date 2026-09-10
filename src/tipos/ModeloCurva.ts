export interface ModeloCurva {
  id: string;
  nome: string;
  expressao: string;
  descricao: string;
  cor: string;
  calcular: (x: number) => number;
}
