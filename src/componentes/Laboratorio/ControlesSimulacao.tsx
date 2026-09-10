import { Button, Tooltip } from "@mui/material";
import type { EstadoSimulacao } from "../../tipos/EstadoSimulacao";
import { RITMOS_REPRODUCAO } from "../../simulacao/configuracaoPadrao";
import { formatarNumero } from "../../utilidades/formatacaoNumerica";
import { Icone } from "../Icone";

interface PropriedadesControlesSimulacao {
  estado: EstadoSimulacao;
  modoDesenho: boolean;
  taxaTempo: number;
  tempo: number;
  aoExecutar: () => void;
  aoReiniciar: () => void;
  aoAvancarPasso: () => void;
  aoAlterarTaxaTempo: (taxa: number) => void;
}

export function ControlesSimulacao({
  estado,
  modoDesenho,
  taxaTempo,
  tempo,
  aoExecutar,
  aoReiniciar,
  aoAvancarPasso,
  aoAlterarTaxaTempo,
}: PropriedadesControlesSimulacao) {
  const emExecucao = estado === "EM_EXECUCAO";
  const encerrado = estado === "LIMITE_FINAL" || estado === "ENCERRADO";
  const icone = emExecucao ? "pause" : encerrado ? "reset" : "play";
  const rotulo = emExecucao
    ? "Pausar"
    : encerrado
      ? "Preparar novo ensaio"
      : estado === "PAUSADO"
        ? "Continuar"
        : "Iniciar experimento";

  return (
    <div className="transport-bar">
      <div className="playback-controls">
        <Button
          variant="contained"
          startIcon={<Icone nome={icone} size={16} />}
          disabled={modoDesenho}
          onClick={aoExecutar}
        >
          {rotulo}
        </Button>
        <Tooltip title="Reiniciar condições e registros">
          <button className="icon-button" aria-label="Reiniciar experimento" onClick={aoReiniciar}>
            <Icone nome="reset" />
          </button>
        </Tooltip>
        <Tooltip title="Avançar 1/120 s">
          <span>
            <button
              className="icon-button"
              aria-label="Avançar um passo"
              disabled={emExecucao || encerrado || modoDesenho}
              onClick={aoAvancarPasso}
            >
              <Icone nome="step" />
            </button>
          </span>
        </Tooltip>
        <span className="control-divider" />
        <label className="speed-control">
          <span>Ritmo</span>
          <select
            aria-label="Ritmo de reprodução"
            value={taxaTempo}
            onChange={(evento) => aoAlterarTaxaTempo(Number(evento.target.value))}
          >
            {RITMOS_REPRODUCAO.map((ritmo) => (
              <option key={ritmo} value={ritmo}>
                {formatarNumero(ritmo, ritmo === 0.25 ? 2 : ritmo === 0.5 ? 1 : 0)}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="time-readout">
        <span>Tempo simulado</span>
        <strong>{formatarNumero(tempo)}<small> s</small></strong>
      </div>
    </div>
  );
}
