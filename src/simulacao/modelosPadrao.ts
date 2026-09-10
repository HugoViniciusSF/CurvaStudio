import type { ModeloCurva } from "../tipos/ModeloCurva";
import { criarFuncaoPorExpressao } from "./avaliadorFuncao";

export const modelosPadrao: ModeloCurva[] = [
  {
    id: "seno",
    nome: "Senoidal",
    expressao: "1.2 * sen(1.25 * x)",
    descricao: "Modelo oscilatório para observar transferência entre energia potencial e cinética.",
    cor: "#246f60",
    calcular: criarFuncaoPorExpressao("1.2 * sen(1.25 * x)"),
  },
  {
    id: "vale",
    nome: "Quadrática convexa",
    expressao: "0.18 * x^2 - 2.4",
    descricao: "Perfil parabólico com vale central e recuperação de altura no final do domínio.",
    cor: "#56806a",
    calcular: criarFuncaoPorExpressao("0.18 * x^2 - 2.4"),
  },
  {
    id: "morro",
    nome: "Quadrática côncava",
    expressao: "-0.22 * x^2 + 3",
    descricao: "Perfil côncavo que exige energia suficiente para atravessar a região de maior altura.",
    cor: "#847099",
    calcular: criarFuncaoPorExpressao("-0.22 * x^2 + 3"),
  },
  {
    id: "cubica",
    nome: "Cúbica assimétrica",
    expressao: "0.035 * x^3 - 0.42 * x",
    descricao: "Curva assimétrica com variação acentuada de inclinação ao longo do domínio.",
    cor: "#527c9b",
    calcular: criarFuncaoPorExpressao("0.035 * x^3 - 0.42 * x"),
  },
  {
    id: "cosseno-rampa",
    nome: "Cosseno com tendência",
    expressao: "0.85 * cos(1.4 * x) + 0.12 * x",
    descricao: "Modelo periódico com termo linear para avaliar tendência global de subida.",
    cor: "#b58843",
    calcular: criarFuncaoPorExpressao("0.85 * cos(1.4 * x) + 0.12 * x"),
  },
];
