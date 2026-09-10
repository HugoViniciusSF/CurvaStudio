import { useCallback, useEffect, useRef, useState } from "react";
import {
  avancarLooping, criarEstadoLooping, estadoNoDesprendimento,
  type ConfiguracaoLooping, type EstadoLooping, type Trajetoria3D, type Ponto3D,
} from "../simulacao/looping3d";

export const PASSO_LOOPING = 1 / 120;
export const INTERVALOS_LOOPING = [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2] as const;

interface RegistroLooping { passo: number; estado: EstadoLooping; extra: boolean }

export function loopingEncerrado(estado: EstadoLooping) {
  return estado.estado === "concluido" || estado.estado === "retornou" || estado.estado === "repouso" || estado.estado === "queda_encerrada";
}

export function faseLooping(estado: EstadoLooping) {
  return estado.estado === "queda_encerrada" ? "voo_encerrado" : estado.estado === "desprendida" ? "voo" : "pista";
}

export function exportarCSVLooping(amostras: EstadoLooping[]) {
  const cabecalho = "tempo_s,distancia_m,x_m,y_m,z_m,velocidade_m_s,energia_cinetica_J,energia_potencial_J,energia_mecanica_J,vx_m_s,vy_m_s,vz_m_s,forca_normal_N,fase";
  const linhas = amostras.map((amostra) => [
    amostra.tempo, amostra.distancia, amostra.posicao.x, amostra.posicao.y, amostra.posicao.z,
    amostra.velocidade, amostra.energiaCinetica, amostra.energiaPotencial, amostra.energiaMecanica,
    amostra.velocidadeVetor.x, amostra.velocidadeVetor.y, amostra.velocidadeVetor.z, amostra.forcaNormal,
  ].map((valor) => Number(valor.toPrecision(12)).toString()).concat(faseLooping(amostra)).join(","));
  return `${cabecalho}\n${linhas.join("\n")}\n`;
}

export function useLooping(trajetoria: Trajetoria3D, configuracao: ConfiguracaoLooping, ativo: boolean) {
  const [estado, definirEstado] = useState(() => criarEstadoLooping(trajetoria, configuracao));
  const [executando, definirExecutando] = useState(false);
  const [ritmo, definirRitmo] = useState(1);
  const [intervalo, definirIntervalo] = useState<number>(0.05);
  const [amostras, definirAmostras] = useState<EstadoLooping[]>([estado]);
  const [rastroVoo, definirRastroVoo] = useState<Ponto3D[]>([]);
  const [erro, definirErro] = useState("");
  const atual = useRef(estado);
  const registros = useRef<RegistroLooping[]>([]);
  const rastro = useRef<Ponto3D[]>([]);
  const selecionadas = useRef<EstadoLooping[]>([]);
  const passos = useRef(0);
  const cadencia = useRef(6);
  const ritmoAtual = useRef(ritmo);
  ritmoAtual.current = ritmo;

  const publicar = useCallback(() => {
    definirEstado(atual.current);
    definirAmostras((anteriores) => anteriores.length === selecionadas.current.length
      && anteriores.at(-1) === selecionadas.current.at(-1)
      ? anteriores : [...selecionadas.current]);
    definirRastroVoo((anterior) => anterior.length === rastro.current.length ? anterior : [...rastro.current]);
  }, []);

  const reiniciar = useCallback(() => {
    const inicial = criarEstadoLooping(trajetoria, configuracao);
    atual.current = inicial;
    passos.current = 0;
    registros.current = [{ passo: 0, estado: inicial, extra: true }];
    selecionadas.current = [inicial];
    rastro.current = [];
    definirExecutando(false);
    definirErro("");
    publicar();
  }, [trajetoria, configuracao, publicar]);

  useEffect(() => { reiniciar(); }, [reiniciar]);
  useEffect(() => { if (!ativo) definirExecutando(false); }, [ativo]);
  useEffect(() => {
    cadencia.current = Math.round(intervalo / PASSO_LOOPING);
    selecionadas.current = registros.current
      .filter((registro) => registro.extra || registro.passo % cadencia.current === 0)
      .map((registro) => registro.estado);
    definirAmostras([...selecionadas.current]);
  }, [intervalo]);

  const avancar = useCallback((manual = false) => {
    if (loopingEncerrado(atual.current)) return false;
    try {
      const anterior = atual.current;
      const proximo = avancarLooping(trajetoria, configuracao, anterior, PASSO_LOOPING);
      atual.current = proximo;
      passos.current += 1;
      if (proximo.desprendimento && !anterior.desprendimento) {
        const evento = proximo.desprendimento;
        const amostraEvento = estadoNoDesprendimento(proximo, configuracao)!;
        const ultima = registros.current.at(-1);
        if (ultima?.estado.tempo === evento.tempo) {
          ultima.estado = amostraEvento;
          ultima.extra = true;
          if (selecionadas.current.at(-1)?.tempo === evento.tempo) selecionadas.current.pop();
        } else registros.current.push({ passo: passos.current, estado: amostraEvento, extra: true });
        selecionadas.current.push(amostraEvento);
        rastro.current.push(evento.posicao);
      }
      if (proximo.desprendimento && proximo.tempo > proximo.desprendimento.tempo) rastro.current.push(proximo.posicao);
      const extra = manual || loopingEncerrado(proximo);
      if ((proximo.tempo !== anterior.tempo || proximo.distancia !== anterior.distancia)
        && registros.current.at(-1)?.estado.tempo !== proximo.tempo) {
        registros.current.push({ passo: passos.current, estado: proximo, extra });
        if (extra || passos.current % cadencia.current === 0) selecionadas.current.push(proximo);
      }
      if (loopingEncerrado(proximo)) definirExecutando(false);
      return !loopingEncerrado(proximo);
    } catch (falha) {
      definirErro(falha instanceof Error ? falha.message : "Não foi possível calcular esta trajetória.");
      definirExecutando(false);
      return false;
    }
  }, [trajetoria, configuracao]);

  useEffect(() => {
    if (!executando || !ativo) return;
    let quadro = 0;
    let anterior: number | null = null;
    let acumulador = 0;
    const visibilidade = () => { anterior = null; };
    const executarQuadro = (agora: number) => {
      const decorrido = anterior === null || document.hidden ? 0 : Math.min((agora - anterior) / 1000, 0.25);
      anterior = agora;
      acumulador += Math.max(0, decorrido) * ritmoAtual.current;
      let mudou = false;
      while (acumulador + 1e-12 >= PASSO_LOOPING) {
        acumulador = Math.max(0, acumulador - PASSO_LOOPING);
        mudou = true;
        if (!avancar()) { publicar(); return; }
      }
      if (mudou) publicar();
      quadro = requestAnimationFrame(executarQuadro);
    };
    document.addEventListener("visibilitychange", visibilidade);
    quadro = requestAnimationFrame(executarQuadro);
    return () => {
      cancelAnimationFrame(quadro);
      document.removeEventListener("visibilitychange", visibilidade);
    };
  }, [ativo, executando, avancar, publicar]);

  const pausar = useCallback(() => definirExecutando(false), []);
  const alternar = () => {
    definirErro("");
    if (loopingEncerrado(atual.current)) reiniciar();
    else if (ativo) definirExecutando((valor) => !valor);
  };
  const passo = () => {
    definirErro("");
    definirExecutando(false);
    avancar(true);
    publicar();
  };
  const alterarIntervalo = (valor: number) => {
    if (INTERVALOS_LOOPING.some((opcao) => opcao === valor)) definirIntervalo(valor);
  };

  return {
    estado, executando, ritmo, definirRitmo, intervalo, alterarIntervalo,
    amostras, rastroVoo, erro, alternar, pausar, passo, reiniciar,
  };
}
