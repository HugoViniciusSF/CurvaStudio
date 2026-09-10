import { useState, type KeyboardEvent } from "react";
import { INTERVALOS_AMOSTRAGEM } from "../../ganchos/useSimulacao";
import type { AmostraSimulacao } from "../../tipos/EstadoSimulacao";
import { formatarCoordenada, formatarNumero } from "../../utilidades/formatacaoNumerica";
import { AnaliseTemporal } from "../AnaliseTemporal/AnaliseTemporal";
import { Icone } from "../Icone";

interface PropriedadesPainelAnalise {
  historico: AmostraSimulacao[];
  intervaloRegistro: number;
  aoAlterarIntervalo: (intervalo: number) => void;
}

const ABAS = [
  { id: "energia", titulo: "Energia" },
  { id: "velocidade", titulo: "Velocidade" },
  { id: "dados", titulo: "Dados" },
] as const;
type AbaAnalise = (typeof ABAS)[number]["id"];

export function PainelAnalise({ historico, intervaloRegistro, aoAlterarIntervalo }: PropriedadesPainelAnalise) {
  const [abaAtiva, setAbaAtiva] = useState<AbaAnalise>("energia");

  function navegarAbas(evento: KeyboardEvent<HTMLButtonElement>) {
    if (evento.key !== "ArrowRight" && evento.key !== "ArrowLeft") return;
    evento.preventDefault();
    const indiceAtual = ABAS.findIndex((aba) => aba.id === abaAtiva);
    const direcao = evento.key === "ArrowRight" ? 1 : -1;
    const proxima = ABAS[(indiceAtual + direcao + ABAS.length) % ABAS.length];
    setAbaAtiva(proxima.id);
    document.getElementById(`tab-${proxima.id}`)?.focus();
  }

  return (
    <div className="analysis-layout">
      <section className="analysis-panel">
        <div className="analysis-header">
          <h2><Icone nome="chart" size={17} />Evolução temporal</h2>
          <span className="sample-label">
            {historico.length} {historico.length === 1 ? "amostra" : "amostras"}
          </span>
        </div>
        <div className="sampling-controls">
          <label htmlFor="intervalo-registro">Intervalo das amostras</label>
          <select
            id="intervalo-registro"
            aria-label="Intervalo das amostras"
            aria-describedby="intervalo-registro-ajuda"
            value={intervaloRegistro}
            onChange={(evento) => aoAlterarIntervalo(Number(evento.target.value))}
          >
            {INTERVALOS_AMOSTRAGEM.map((intervalo) => (
              <option key={intervalo} value={intervalo}>{formatarCoordenada(intervalo)} s</option>
            ))}
          </select>
          <span>de simulação</span>
        </div>
        <p id="intervalo-registro-ajuda" className="sampling-hint">
          Atualiza também as amostras anteriores, sem reiniciar o experimento.
        </p>
        <div className="analysis-tabs" role="tablist" aria-label="Grandeza para análise">
          {ABAS.map((aba) => (
            <button
              key={aba.id}
              id={`tab-${aba.id}`}
              role="tab"
              aria-selected={abaAtiva === aba.id}
              aria-controls="painel-analise"
              tabIndex={abaAtiva === aba.id ? 0 : -1}
              onClick={() => setAbaAtiva(aba.id)}
              onKeyDown={navegarAbas}
            >
              {aba.titulo}
            </button>
          ))}
        </div>
        <div id="painel-analise" role="tabpanel" aria-labelledby={`tab-${abaAtiva}`} tabIndex={0}>
          {abaAtiva === "dados"
            ? <TabelaAmostras historico={historico} />
            : <AnaliseTemporal historico={historico} grandeza={abaAtiva} />}
        </div>
      </section>
    </div>
  );
}

function TabelaAmostras({ historico }: { historico: AmostraSimulacao[] }) {
  return (
    <div className="data-view">
      <p className="field-hint">
        Últimas 8 amostras. Exporte o CSV para consultar o registro completo.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>t (s)</th>
              <th>x (m)</th>
              <th>v (m/s)</th>
              <th>Ec (J)</th>
              <th>Ep (J)</th>
              <th>Em (J)</th>
            </tr>
          </thead>
          <tbody>
            {historico.slice(-8).map((amostra, indice) => (
              <tr key={indice}>
                <td>{formatarNumero(amostra.tempo, 3)}</td>
                <td>{formatarNumero(amostra.x)}</td>
                <td>{formatarNumero(amostra.velocidade)}</td>
                <td>{formatarNumero(amostra.energiaCinetica)}</td>
                <td>{formatarNumero(amostra.energiaPotencial)}</td>
                <td>{formatarNumero(amostra.energiaTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
