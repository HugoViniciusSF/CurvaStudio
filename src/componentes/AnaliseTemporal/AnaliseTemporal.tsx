import { memo, useId, useMemo } from "react";
import { formatarNumeroEixo } from "../../utilidades/formatacaoNumerica";
import type { AmostraSimulacao } from "../../tipos/EstadoSimulacao";

interface PropriedadesAnaliseTemporal {
  historico: AmostraSimulacao[];
  grandeza?: "energia" | "velocidade";
}

type CampoSerie = "energiaCinetica" | "energiaPotencial" | "energiaTotal" | "velocidade";
interface Serie { campo: CampoSerie; simbolo: string; nome: string; cor: string }
interface Ponto { tempo: number; valor: number }

const SERIES_ENERGIA: Serie[] = [
  { campo: "energiaCinetica", simbolo: "Ec", nome: "Cinética", cor: "#b58843" },
  { campo: "energiaPotencial", simbolo: "Ep", nome: "Potencial", cor: "#6688a8" },
  { campo: "energiaTotal", simbolo: "Em", nome: "Mecânica", cor: "#246f60" },
];
const SERIES_VELOCIDADE: Serie[] = [
  { campo: "velocidade", simbolo: "v", nome: "Velocidade tangencial", cor: "#246f60" },
];
const AREA = { esquerda: 61, direita: 604, topo: 23, base: 149 };
const FONTE_NUMEROS = "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace";

export const AnaliseTemporal = memo(function AnaliseTemporal({ historico, grandeza = "energia" }: PropriedadesAnaliseTemporal) {
  const id = useId().replace(/:/g, "");
  const series = grandeza === "energia" ? SERIES_ENERGIA : SERIES_VELOCIDADE;
  const dados = useMemo(() => {
    let minimo = 0;
    let maximo = 0;
    let tempoFinal = 0;
    let quantidadeValida = 0;
    for (const amostra of historico) {
      if (!Number.isFinite(amostra.tempo) || amostra.tempo < 0) continue;
      let temValor = false;
      for (const serie of series) {
        const valor = amostra[serie.campo];
        if (!Number.isFinite(valor)) continue;
        minimo = Math.min(minimo, valor);
        maximo = Math.max(maximo, valor);
        temValor = true;
      }
      if (temValor) {
        tempoFinal = Math.max(tempoFinal, amostra.tempo);
        quantidadeValida += 1;
      }
    }
    const amplitude = maximo - minimo;
    const folga = amplitude > 0 ? amplitude * 0.1 : 1;
    const limiteMinimo = minimo < 0 ? minimo - folga : 0;
    const limiteMaximo = maximo > 0 ? maximo + folga : maximo === 0 && minimo === 0 ? 1 : 0;
    return {
      minimo: limiteMinimo,
      maximo: limiteMaximo,
      tempoFinal,
      quantidadeValida,
      curvas: series.map((serie) => ({
        ...serie,
        pontos: reduzirSerie(historico.flatMap((amostra) =>
          Number.isFinite(amostra.tempo) && amostra.tempo >= 0 && Number.isFinite(amostra[serie.campo])
            ? [{ tempo: amostra.tempo, valor: amostra[serie.campo] }]
            : [],
        )),
      })),
    };
  }, [historico, series]);
  const largura = AREA.direita - AREA.esquerda;
  const altura = AREA.base - AREA.topo;
  const x = (tempo: number) => AREA.esquerda + tempo / (dados.tempoFinal || 1) * largura;
  const y = (valor: number) => AREA.base - (valor - dados.minimo) / (dados.maximo - dados.minimo) * altura;
  const temEvolucao = dados.quantidadeValida > 1 && dados.tempoFinal > 0;
  const marcasX = temEvolucao ? criarMarcas(0, dados.tempoFinal, 5) : [0];
  const marcasY = dados.quantidadeValida > 0 ? criarMarcas(dados.minimo, dados.maximo, 3) : [0];
  const unidade = grandeza === "energia" ? "E (J)" : "v (m/s)";
  const descricao = grandeza === "energia" ? "Energias cinética, potencial e mecânica ao longo do tempo" : "Velocidade tangencial ao longo do tempo";

  return (
    <>
      <svg
        role="img"
        aria-label={`${descricao}. ${temEvolucao ? `Registro até ${formatarNumeroEixo(dados.tempoFinal)} segundos.` : "Execute o experimento para registrar a evolução temporal."}`}
        viewBox="0 0 620 190"
        style={{ display: "block", width: "100%", height: "auto", background: "#fff", fontFamily: "inherit" }}
      >
        <defs>
          <clipPath id={`${id}-area-temporal`}>
            <rect x={AREA.esquerda - 3} y={AREA.topo - 3} width={largura + 6} height={altura + 6} />
          </clipPath>
        </defs>
        <g stroke="#e7eceb" strokeWidth="1" shapeRendering="crispEdges">
          {marcasX.map((valor) => <line key={`x${valor}`} x1={x(valor)} x2={x(valor)} y1={AREA.topo} y2={AREA.base} />)}
          {marcasY.map((valor) => <line key={`y${valor}`} x1={AREA.esquerda} x2={AREA.direita} y1={y(valor)} y2={y(valor)} />)}
        </g>
        {dados.minimo < 0 && dados.maximo > 0 && <line x1={AREA.esquerda} x2={AREA.direita} y1={y(0)} y2={y(0)} stroke="#c4d0ca" />}
        <path d={`M ${AREA.esquerda} ${AREA.topo} V ${AREA.base} H ${AREA.direita}`} stroke="#c4d0ca" strokeWidth="1" fill="none" />
        <g fill="#7d8985" fontFamily={FONTE_NUMEROS} fontSize="12">
          {marcasX.map((valor) => <g key={valor}>
            <line x1={x(valor)} x2={x(valor)} y1={AREA.base} y2={AREA.base + 4} stroke="#c4d0ca" />
            <text x={x(valor)} y={AREA.base + 20} textAnchor={x(valor) > AREA.direita - 15 ? "end" : "middle"}>{formatarNumeroEixo(valor)}</text>
          </g>)}
          {marcasY.map((valor) => <g key={valor}>
            <line x1={AREA.esquerda - 4} x2={AREA.esquerda} y1={y(valor)} y2={y(valor)} stroke="#c4d0ca" />
            <text x={AREA.esquerda - 10} y={y(valor) + 4} textAnchor="end">{formatarNumeroEixo(valor)}</text>
          </g>)}
          <text x={AREA.esquerda} y="13">{unidade}</text>
          <text x={AREA.direita} y="187" textAnchor="end">t (s)</text>
        </g>
        <g clipPath={`url(#${id}-area-temporal)`}>
          {dados.curvas.map((serie) => <g key={serie.campo}>
            {serie.pontos.length > 1 && <path
              d={serie.pontos.map((ponto, indice) => `${indice === 0 ? "M" : "L"}${x(ponto.tempo).toFixed(2)},${y(ponto.valor).toFixed(2)}`).join(" ")}
              fill="none"
              stroke={serie.cor}
              strokeWidth={serie.campo === "energiaTotal" ? 2 : 1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />}
            {serie.pontos.length === 1 && <circle cx={x(serie.pontos[0].tempo)} cy={y(serie.pontos[0].valor)} r="3" fill={serie.cor} />}
          </g>)}
        </g>
        {!temEvolucao && <g>
          <rect x="111" y="66" width="450" height="39" rx="4" fill="#fff" fillOpacity="0.94" />
          <text x={(AREA.esquerda + AREA.direita) / 2} y="82" textAnchor="middle" fill="#7d8985" fontSize="12">
            <tspan x={(AREA.esquerda + AREA.direita) / 2}>Execute o experimento para registrar</tspan>
            <tspan x={(AREA.esquerda + AREA.direita) / 2} dy="17">a evolução temporal.</tspan>
          </text>
        </g>}
      </svg>
      <div className="chart-legend">
        {series.map((serie) => <span key={serie.campo}>
          <i aria-hidden="true" style={{ backgroundColor: serie.cor }} />
          <span>{serie.simbolo} · {serie.nome}</span>
        </span>)}
      </div>
    </>
  );
});

function criarMarcas(minimo: number, maximo: number, quantidade: number) {
  const alvo = (maximo - minimo) / quantidade;
  const potencia = 10 ** Math.floor(Math.log10(alvo));
  const fator = alvo / potencia;
  const passo = (fator <= 1 ? 1 : fator <= 2 ? 2 : fator <= 2.5 ? 2.5 : fator <= 5 ? 5 : 10) * potencia;
  const marcas: number[] = [];
  for (let i = Math.ceil(minimo / passo); i <= Math.floor(maximo / passo); i += 1) {
    marcas.push(Number((i * passo).toPrecision(12)));
  }
  return marcas;
}

// Preserva extremos e pontos inicial/final de cada intervalo para manter
// variações rápidas visíveis, sem modificar as amostras da simulação.
function reduzirSerie(pontos: Ponto[], limite = 600) {
  if (pontos.length <= limite) return pontos;
  const intervalos = Math.floor((limite - 2) / 2);
  const tamanho = (pontos.length - 2) / intervalos;
  const reduzidos = [pontos[0]];
  for (let intervalo = 0; intervalo < intervalos; intervalo += 1) {
    const inicio = 1 + Math.floor(intervalo * tamanho);
    const fim = Math.min(1 + Math.floor((intervalo + 1) * tamanho), pontos.length - 1);
    let menor = inicio;
    let maior = inicio;
    for (let i = inicio + 1; i < fim; i += 1) {
      if (pontos[i].valor < pontos[menor].valor) menor = i;
      if (pontos[i].valor > pontos[maior].valor) maior = i;
    }
    reduzidos.push(pontos[Math.min(menor, maior)]);
    if (menor !== maior) reduzidos.push(pontos[Math.max(menor, maior)]);
  }
  reduzidos.push(pontos[pontos.length - 1]);
  return reduzidos;
}
