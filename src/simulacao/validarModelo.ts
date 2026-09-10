import type { ConfiguracaoSimulacao } from "../tipos/ConfiguracaoSimulacao";
import type { ModeloCurva } from "../tipos/ModeloCurva";
import { criarMetricas, criarParticulaInicial } from "./fisica";
import { gerarTrajetoria } from "./gerarTrajetoria";

/** Verifica se a trajetória e seu estado inicial são válidos nos parâmetros atuais. */
export function validarModelo(modelo: ModeloCurva, configuracao: ConfiguracaoSimulacao) {
  const trajetoria = gerarTrajetoria(modelo, configuracao);
  const particula = criarParticulaInicial(modelo, trajetoria, configuracao.velocidadeInicial);
  criarMetricas(particula, configuracao);
}
