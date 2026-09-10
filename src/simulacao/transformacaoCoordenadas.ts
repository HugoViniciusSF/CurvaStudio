import type { ConfiguracaoSimulacao } from "../tipos/ConfiguracaoSimulacao";
import type { LimitesTrajetoria } from "./gerarTrajetoria";

export function converterMundoParaTela(
  x: number,
  y: number,
  limites: LimitesTrajetoria,
  configuracao: ConfiguracaoSimulacao,
) {
  const { largura, altura, margem, dominio } = configuracao;
  const larguraUtil = largura - margem.esquerda - margem.direita;
  const alturaUtil = altura - margem.topo - margem.baixo;
  const intervaloY = Math.max(limites.maximoY - limites.minimoY, 1);
  const progressoX = (x - dominio.minimo) / (dominio.maximo - dominio.minimo);
  const progressoY = (y - limites.minimoY) / intervaloY;

  return {
    x: margem.esquerda + progressoX * larguraUtil,
    y: altura - margem.baixo - progressoY * alturaUtil,
  };
}

export function converterTelaParaMundo(
  telaX: number,
  telaY: number,
  limites: LimitesTrajetoria,
  configuracao: ConfiguracaoSimulacao,
) {
  const { largura, altura, margem, dominio } = configuracao;
  const larguraUtil = largura - margem.esquerda - margem.direita;
  const alturaUtil = altura - margem.topo - margem.baixo;
  const intervaloY = Math.max(limites.maximoY - limites.minimoY, 1);
  const progressoX = (telaX - margem.esquerda) / larguraUtil;
  const progressoY = (altura - margem.baixo - telaY) / alturaUtil;

  return {
    x: dominio.minimo + progressoX * (dominio.maximo - dominio.minimo),
    y: limites.minimoY + progressoY * intervaloY,
  };
}
