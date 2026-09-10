import { useCallback, useEffect, useRef, useState } from "react";
import type { EstadoParticula } from "../tipos/Particula";
import type { ConfiguracaoSimulacao } from "../tipos/ConfiguracaoSimulacao";
import type { ModeloCurva } from "../tipos/ModeloCurva";
import type { AmostraSimulacao, EstadoSimulacao } from "../tipos/EstadoSimulacao";
import type { DadosTrajetoria } from "../simulacao/gerarTrajetoria";
import { criarParticulaInicial, criarMetricas, simularFisica } from "../simulacao/fisica";
import { HistoricoSimulacao } from "../simulacao/historico";
import { RITMOS_REPRODUCAO } from "../simulacao/configuracaoPadrao";

export const PASSO_SIMULACAO = 1 / 120;
export const INTERVALOS_AMOSTRAGEM = [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2] as const;
export const INTERVALO_AMOSTRAGEM_PADRAO = 0.05;

export function useSimulacao(
  funcao: ModeloCurva,
  trajetoria: DadosTrajetoria,
  configuracao: ConfiguracaoSimulacao,
  taxaTempo = 1,
  intervaloAmostragem = INTERVALO_AMOSTRAGEM_PADRAO,
) {
  const intervaloValido = INTERVALOS_AMOSTRAGEM.some((valor) => valor === intervaloAmostragem)
    ? intervaloAmostragem
    : INTERVALO_AMOSTRAGEM_PADRAO;
  const passosPorAmostra = Math.round(intervaloValido / PASSO_SIMULACAO);
  const [estado, definirEstado] = useState<EstadoSimulacao>("PRONTO");
  const [particula, definirParticula] = useState<EstadoParticula>(() =>
    criarParticulaInicial(funcao, trajetoria, configuracao.velocidadeInicial));
  const [metricas, definirMetricas] = useState(() => criarMetricas(particula, configuracao));
  const [tempo, definirTempo] = useState(0);
  const [historico, definirHistorico] = useState<AmostraSimulacao[]>([]);
  const [erro, definirErro] = useState<string | null>(null);
  const animacaoRef = useRef<number | null>(null);
  const tempoAnteriorRef = useRef<number | null>(null);
  const acumuladorRef = useRef(0);
  const passosRef = useRef(0);
  const tempoRef = useRef(0);
  const desvioTempoRef = useRef(0);
  const particulaRef = useRef(particula);
  const metricasRef = useRef(metricas);
  const estadoRef = useRef<EstadoSimulacao>(estado);
  const registrosRef = useRef<HistoricoSimulacao | null>(null);
  const registros = registrosRef.current ??= new HistoricoSimulacao(passosPorAmostra);
  const taxaRef = useRef(taxaTempo);
  taxaRef.current = RITMOS_REPRODUCAO.includes(taxaTempo) ? taxaTempo : 1;

  useEffect(() => {
    registros.selecionarIntervalo(passosPorAmostra);
    definirHistorico(registros.obterAmostras());
  }, [passosPorAmostra, registros]);

  const mudarEstado = useCallback((proximo: EstadoSimulacao) => {
    estadoRef.current = proximo;
    definirEstado(proximo);
  }, []);

  const cancelarAnimacao = useCallback(() => {
    if (animacaoRef.current !== null) cancelAnimationFrame(animacaoRef.current);
    animacaoRef.current = null;
    tempoAnteriorRef.current = null;
  }, []);

  const registrarAmostra = useCallback((extra = false) => {
    registros.registrar(passosRef.current, tempoRef.current, particulaRef.current.x, metricasRef.current, extra);
  }, [registros]);

  const publicar = useCallback(() => {
    definirParticula(particulaRef.current);
    definirMetricas(metricasRef.current);
    definirTempo(tempoRef.current);
    definirHistorico(registros.obterAmostras());
  }, [registros]);

  const reiniciar = useCallback(() => {
    cancelarAnimacao();
    particulaRef.current = criarParticulaInicial(funcao, trajetoria, configuracao.velocidadeInicial);
    metricasRef.current = criarMetricas(particulaRef.current, configuracao);
    passosRef.current = 0;
    tempoRef.current = 0;
    desvioTempoRef.current = 0;
    acumuladorRef.current = 0;
    registros.reiniciar();
    registrarAmostra();
    publicar();
    definirErro(null);
    mudarEstado("PRONTO");
  }, [cancelarAnimacao, configuracao, funcao, mudarEstado, publicar, registrarAmostra, registros, trajetoria]);

  useEffect(() => { reiniciar(); }, [reiniciar]);

  const avancar = useCallback(() => {
    try {
      const proximo = simularFisica({
        funcao,
        trajetoria,
        configuracao,
        anterior: particulaRef.current,
        tempoDecorrido: PASSO_SIMULACAO,
      });
      particulaRef.current = proximo.particula;
      metricasRef.current = proximo.metricas;
      passosRef.current += 1;
      // A integração pode encerrar antes de completar um passo na fronteira
      // ou no repouso. Mantém a grade regular exata e contabiliza esse trecho.
      desvioTempoRef.current += proximo.tempoIntegrado - PASSO_SIMULACAO;
      tempoRef.current = passosRef.current * PASSO_SIMULACAO + desvioTempoRef.current;
      const terminou = proximo.chegou || proximo.parou;
      registrarAmostra(terminou);
      if (terminou) mudarEstado(proximo.chegou ? "LIMITE_FINAL" : "ENCERRADO");
      return !terminou;
    } catch (falha) {
      definirErro(falha instanceof Error ? falha.message : "Não foi possível integrar esta curva.");
      mudarEstado("PAUSADO");
      return false;
    }
  }, [configuracao, funcao, mudarEstado, registrarAmostra, trajetoria]);

  useEffect(() => {
    if (estado !== "EM_EXECUCAO") return undefined;
    const laco = (agora: number) => {
      if (estadoRef.current !== "EM_EXECUCAO") return;
      const anterior = tempoAnteriorRef.current ?? agora;
      tempoAnteriorRef.current = agora;
      // Desconsidera o tempo em abas suspensas e limita a recuperação após travamentos.
      const intervalo = document.hidden ? 0 : Math.min(Math.max((agora - anterior) / 1000, 0), 0.25);
      acumuladorRef.current += intervalo * taxaRef.current;
      const passosAntes = passosRef.current;
      while (acumuladorRef.current + 1e-12 >= PASSO_SIMULACAO) {
        acumuladorRef.current = Math.max(0, acumuladorRef.current - PASSO_SIMULACAO);
        if (!avancar()) {
          acumuladorRef.current = 0;
          if (passosRef.current !== passosAntes) publicar();
          cancelarAnimacao();
          return;
        }
      }
      if (passosRef.current !== passosAntes) publicar();
      animacaoRef.current = requestAnimationFrame(laco);
    };
    const aoMudarVisibilidade = () => { tempoAnteriorRef.current = null; };
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    animacaoRef.current = requestAnimationFrame(laco);
    return () => {
      cancelarAnimacao();
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
  }, [avancar, cancelarAnimacao, estado, publicar]);

  const iniciar = useCallback(() => {
    if (estadoRef.current === "EM_EXECUCAO" || estadoRef.current === "LIMITE_FINAL" || estadoRef.current === "ENCERRADO") return;
    definirErro(null);
    tempoAnteriorRef.current = null;
    mudarEstado("EM_EXECUCAO");
  }, [mudarEstado]);

  const pausar = useCallback(() => {
    if (estadoRef.current !== "EM_EXECUCAO") return;
    cancelarAnimacao();
    mudarEstado("PAUSADO");
  }, [cancelarAnimacao, mudarEstado]);

  const passo = useCallback(() => {
    if (estadoRef.current === "LIMITE_FINAL" || estadoRef.current === "ENCERRADO") return;
    cancelarAnimacao();
    acumuladorRef.current = 0;
    definirErro(null);
    mudarEstado("PAUSADO");
    avancar();
    registrarAmostra(true);
    publicar();
  }, [avancar, cancelarAnimacao, mudarEstado, publicar, registrarAmostra]);

  const exportarCSV = useCallback(() => registros.exportarCSV(), [registros]);

  return {
    estado, particula, metricas, iniciar, reiniciar,
    pausar, passo, tempo, historico, exportarCSV, erro,
  };
}
