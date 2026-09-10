export interface RoteiroEstudo {
  id: string;
  numero: string;
  titulo: string;
  tema: string;
  texto: string;
  modeloId: string;
  coeficienteAtrito: number;
  gravidade: number;
  velocidadeInicial: number;
  pergunta: string;
}

export const roteiros: RoteiroEstudo[] = [
  {
    id: "energia",
    numero: "01",
    titulo: "Conservação da energia",
    tema: "ENERGIA MECÂNICA",
    texto: "Observe como a energia se transforma quando a partícula percorre um vale sem atrito.",
    modeloId: "vale",
    coeficienteAtrito: 0,
    gravidade: 9.81,
    velocidadeInicial: 1.5,
    pergunta: "Em que ponto a velocidade é máxima? A energia mecânica permanece constante?",
  },
  {
    id: "atrito",
    numero: "02",
    titulo: "O efeito da dissipação",
    tema: "FORÇAS DISSIPATIVAS",
    texto: "Investigue a perda de energia e o retorno da partícula em uma trajetória parabólica.",
    modeloId: "vale",
    coeficienteAtrito: 0.15,
    gravidade: 9.81,
    velocidadeInicial: 0,
    pergunta: "A partícula recupera a altura inicial? Aumente μ e compare a evolução da energia.",
  },
  {
    id: "gravidade",
    numero: "03",
    titulo: "Um experimento na Lua",
    tema: "CAMPO GRAVITACIONAL",
    texto: "Mude o campo gravitacional e investigue o movimento na mesma curva senoidal.",
    modeloId: "seno",
    coeficienteAtrito: 0,
    gravidade: 1.62,
    velocidadeInicial: 4,
    pergunta: "Como a variação da velocidade muda entre Lua e Terra? Mantenha os demais parâmetros iguais.",
  },
];
