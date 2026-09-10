import { useId, useMemo, useRef, type PointerEvent } from "react";
import type { EstadoParticula } from "../../tipos/Particula";
import type { ConfiguracaoSimulacao } from "../../tipos/ConfiguracaoSimulacao";
import type { ModeloCurva } from "../../tipos/ModeloCurva";
import type { DadosTrajetoria } from "../../simulacao/gerarTrajetoria";
import type { PontoDesenhado } from "../../simulacao/funcaoDesenhada";
import { formatarCoordenada } from "../../utilidades/formatacaoNumerica";
import { converterMundoParaTela, converterTelaParaMundo } from "../../simulacao/transformacaoCoordenadas";

interface PropriedadesVisualizadorTrajetoria {
  particula: EstadoParticula;
  configuracao: ConfiguracaoSimulacao;
  funcaoSelecionada: ModeloCurva;
  corParticula: string;
  aoAlterarCorParticula: (cor: string) => void;
  trajetoria: DadosTrajetoria;
  modoDesenho: boolean;
  pontosDesenho: PontoDesenhado[];
  aoIniciarDesenho: () => void;
  aoAdicionarPontoDesenho: (ponto: PontoDesenhado) => void;
  aoFinalizarDesenho: () => void;
  mostrarGrade?: boolean;
  mostrarTangente?: boolean;
  mostrarVetor?: boolean;
}

const FONTE_NUMEROS = "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace";

export function VisualizadorTrajetoria({
  particula,
  configuracao,
  funcaoSelecionada,
  corParticula,
  aoAlterarCorParticula,
  trajetoria,
  modoDesenho,
  pontosDesenho,
  aoIniciarDesenho,
  aoAdicionarPontoDesenho,
  aoFinalizarDesenho,
  mostrarGrade = true,
  mostrarTangente = false,
  mostrarVetor = false,
}: PropriedadesVisualizadorTrajetoria) {
  const COR_CURVA = funcaoSelecionada.cor || "#257567";
  const id = useId().replace(/:/g, "");
  const ponteiroAtivo = useRef<number | null>(null);
  const { largura, altura, margem, dominio } = configuracao;
  const esquerda = margem.esquerda;
  const direita = largura - margem.direita;
  const topo = margem.topo;
  const base = altura - margem.baixo;
  const larguraUtil = direita - esquerda;
  const alturaUtil = base - topo;
  const marcasX = useMemo(() => criarMarcas(dominio.minimo, dominio.maximo, 10), [dominio.minimo, dominio.maximo]);
  const marcasY = useMemo(() => criarMarcas(trajetoria.limites.minimoY, trajetoria.limites.maximoY, 6), [trajetoria.limites]);
  const caminhoDesenho = useMemo(
    () => criarCaminhoDesenho(pontosDesenho, trajetoria, configuracao),
    [pontosDesenho, trajetoria, configuracao],
  );
  const telaX = (x: number) => converterMundoParaTela(x, 0, trajetoria.limites, configuracao).x;
  const telaY = (y: number) => converterMundoParaTela(0, y, trajetoria.limites, configuracao).y;
  const origemXVisivel = dominio.minimo <= 0 && dominio.maximo >= 0;
  const origemYVisivel = trajetoria.limites.minimoY <= 0 && trajetoria.limites.maximoY >= 0;
  const origemX = origemXVisivel ? telaX(0) : esquerda;
  const origemY = origemYVisivel ? telaY(0) : base;
  const angulo = (particula.angulo * Math.PI) / 180;
  const escalaX = larguraUtil / (dominio.maximo - dominio.minimo);
  const escalaY = alturaUtil / Math.max(trajetoria.limites.maximoY - trajetoria.limites.minimoY, 1);
  const direcaoX = Math.cos(angulo) * escalaX;
  const direcaoY = -Math.sin(angulo) * escalaY;
  const comprimentoDirecao = Math.hypot(direcaoX, direcaoY) || 1;
  const tangenteX = (direcaoX / comprimentoDirecao) * 115;
  const tangenteY = (direcaoY / comprimentoDirecao) * 115;
  // A seta representa o deslocamento em 0,10 s. Cada componente usa a escala
  // do seu eixo, pois o gráfico não precisa ter a mesma escala em x e y.
  const vetorX = particula.telaX + direcaoX * particula.velocidade * 0.1;
  const vetorY = particula.telaY + direcaoY * particula.velocidade * 0.1;
  const larguraRotulo = 200;
  const rotuloX = limitar(
    particula.telaX + larguraRotulo + 20 > direita ? particula.telaX - larguraRotulo - 16 : particula.telaX + 16,
    esquerda + 6,
    direita - larguraRotulo - 6,
  );
  const rotuloY = limitar(particula.telaY - 44, topo + 5, base - 34);

  function pontoDoEvento(evento: PointerEvent<SVGSVGElement>) {
    const svg = evento.currentTarget;
    const matriz = svg.getScreenCTM();
    if (!matriz) return null;
    const ponto = svg.createSVGPoint();
    ponto.x = evento.clientX;
    ponto.y = evento.clientY;
    return ponto.matrixTransform(matriz.inverse());
  }

  function adicionarPonto(evento: PointerEvent<SVGSVGElement>) {
    const ponto = pontoDoEvento(evento);
    if (!ponto) return;
    const mundo = converterTelaParaMundo(ponto.x, ponto.y, trajetoria.limites, configuracao);
    aoAdicionarPontoDesenho({
      x: limitar(mundo.x, dominio.minimo, dominio.maximo),
      y: limitar(mundo.y, trajetoria.limites.minimoY, trajetoria.limites.maximoY),
    });
  }

  function iniciarDesenho(evento: PointerEvent<SVGSVGElement>) {
    if (!modoDesenho || !evento.isPrimary || evento.button !== 0 || ponteiroAtivo.current !== null) return;
    const ponto = pontoDoEvento(evento);
    if (!ponto || ponto.x < esquerda || ponto.x > direita || ponto.y < topo || ponto.y > base) return;
    evento.preventDefault();
    ponteiroAtivo.current = evento.pointerId;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    aoIniciarDesenho();
    adicionarPonto(evento);
  }

  function moverDesenho(evento: PointerEvent<SVGSVGElement>) {
    if (!modoDesenho || ponteiroAtivo.current !== evento.pointerId) return;
    evento.preventDefault();
    adicionarPonto(evento);
  }

  function finalizarDesenho(evento: PointerEvent<SVGSVGElement>) {
    if (ponteiroAtivo.current !== evento.pointerId) return;
    ponteiroAtivo.current = null;
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }
    aoFinalizarDesenho();
  }

  return (
    <div className="trajectory-view">
      <div className="trajectory-legend" aria-label="Legenda da trajetória">
        <span className="trajectory-legend-item"><i className="trajectory-line-swatch" style={{ backgroundColor: COR_CURVA }} aria-hidden="true" />Trajetória f(x)</span>
        <label className="particle-color-control" title="Clique na bolinha para mudar a cor da partícula">
          <input type="color" aria-label="Cor da partícula" value={corParticula} onChange={(evento) => aoAlterarCorParticula(evento.target.value)} />
          <span>Partícula</span>
        </label>
        {mostrarTangente && <span className="trajectory-legend-item"><i className="trajectory-tangent-swatch" aria-hidden="true" />Tangente</span>}
        {mostrarVetor && <span className="trajectory-vector-caption">Vetor v · escala temporal 0,10 s</span>}
      </div>
      <svg
        aria-labelledby={`${id}-titulo ${id}-descricao`}
        data-desenhando={modoDesenho}
        onPointerDown={iniciarDesenho}
        onPointerMove={moverDesenho}
        onPointerUp={finalizarDesenho}
        onPointerCancel={finalizarDesenho}
        onLostPointerCapture={finalizarDesenho}
        role="img"
        viewBox={`0 0 ${largura} ${altura}`}
        style={{ display: "block", width: "100%", height: "auto", background: "#fff", touchAction: modoDesenho ? "none" : "auto", cursor: modoDesenho ? "crosshair" : "default", userSelect: "none", fontFamily: "inherit" }}
      >
        <title id={`${id}-titulo`}>{`Trajetória de ${funcaoSelecionada.expressao}`}</title>
        <desc id={`${id}-descricao`}>
          Gráfico de posição em metros. Partícula em x = {formatarCoordenada(particula.x, 2)} m e y = {formatarCoordenada(particula.y, 2)} m.
          {mostrarVetor ? " O vetor de velocidade representa o deslocamento tangencial em 0,10 segundo." : ""}
        </desc>
        <defs>
          <clipPath id={`${id}-area`}><rect x={esquerda} y={topo} width={larguraUtil} height={alturaUtil} /></clipPath>
          <marker id={`${id}-seta`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 0 L 7 3.5 L 0 7 Z" fill="#b6813c" />
          </marker>
        </defs>

        <g clipPath={`url(#${id}-area)`}>
          {mostrarGrade && <g strokeWidth="1" shapeRendering="crispEdges">
            {marcasX.secundarias.map((x) => <line key={`xm${x}`} x1={telaX(x)} x2={telaX(x)} y1={topo} y2={base} stroke="#f3f5f4" />)}
            {marcasY.secundarias.map((y) => <line key={`ym${y}`} x1={esquerda} x2={direita} y1={telaY(y)} y2={telaY(y)} stroke="#f3f5f4" />)}
            {marcasX.principais.map((x) => <line key={`x${x}`} x1={telaX(x)} x2={telaX(x)} y1={topo} y2={base} stroke="#e7eceb" />)}
            {marcasY.principais.map((y) => <line key={`y${y}`} x1={esquerda} x2={direita} y1={telaY(y)} y2={telaY(y)} stroke="#e7eceb" />)}
          </g>}
          <g stroke="#c5d0cb" strokeWidth="1" shapeRendering="crispEdges">
            {origemXVisivel && <line x1={origemX} x2={origemX} y1={topo} y2={base} />}
            {origemYVisivel && <line x1={esquerda} x2={direita} y1={origemY} y2={origemY} />}
          </g>
          {!modoDesenho && <g stroke={corParticula} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 5">
            <line x1={particula.telaX} x2={particula.telaX} y1={particula.telaY} y2={origemY} />
            <line x1={particula.telaX} x2={origemX} y1={particula.telaY} y2={particula.telaY} />
          </g>}
          <path d={trajetoria.caminho} fill="none" stroke={COR_CURVA} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round" opacity={modoDesenho ? 0.2 : 1} />
          {caminhoDesenho && modoDesenho && <path d={caminhoDesenho} fill="none" stroke={COR_CURVA} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />}
          {mostrarTangente && !modoDesenho && <line x1={particula.telaX - tangenteX} y1={particula.telaY - tangenteY} x2={particula.telaX + tangenteX} y2={particula.telaY + tangenteY} stroke="#8e9e97" strokeWidth="1.3" strokeDasharray="6 5" />}
          {mostrarVetor && !modoDesenho && Math.abs(particula.velocidade) > 0.01 && <line x1={particula.telaX} y1={particula.telaY} x2={vetorX} y2={vetorY} stroke="#b6813c" strokeWidth="2" markerEnd={`url(#${id}-seta)`} />}
        </g>

        <path d={`M ${esquerda} ${topo} V ${base} H ${direita}`} stroke="#bdc9c3" strokeWidth="1" fill="none" />
        <g fontFamily={FONTE_NUMEROS} fontSize="11" fill="#7d8985">
          {marcasX.principais.map((x) => <g key={x}>
            <line x1={telaX(x)} x2={telaX(x)} y1={base} y2={base + 5} stroke="#bdc9c3" />
            <text x={telaX(x)} y={base + 22} textAnchor="middle">{formatarCoordenada(x)}</text>
          </g>)}
          {marcasY.principais.map((y) => <g key={y}>
            <line x1={esquerda - 5} x2={esquerda} y1={telaY(y)} y2={telaY(y)} stroke="#bdc9c3" />
            <text x={esquerda - 13} y={telaY(y) + 4} textAnchor="end">{formatarCoordenada(y)}</text>
          </g>)}
          <text x={esquerda - 12} y={topo - 15} textAnchor="end" fontSize="12">y (m)</text>
          <text x={direita} y={base + 45} textAnchor="end" fontSize="12">x (m)</text>
        </g>

        {!modoDesenho && <>
          <g fill="#7d8985" fontSize="12" fontFamily={FONTE_NUMEROS}>
            <circle cx={trajetoria.inicio.telaX} cy={trajetoria.inicio.telaY} r="3" fill="#fff" stroke={COR_CURVA} strokeWidth="1.5" />
            <text x={trajetoria.inicio.telaX + 10} y={limitar(trajetoria.inicio.telaY + 25, topo + 16, base - 9)}>x₀</text>
            <circle cx={trajetoria.chegada.telaX} cy={trajetoria.chegada.telaY} r="3" fill="#fff" stroke={COR_CURVA} strokeWidth="1.5" />
            <text x={trajetoria.chegada.telaX - 10} y={limitar(trajetoria.chegada.telaY + 25, topo + 16, base - 9)} textAnchor="end">x<tspan baselineShift="sub" fontSize="9">f</tspan></text>
          </g>
          <circle cx={particula.telaX} cy={particula.telaY} r="15" fill={corParticula} opacity="0.08" />
          <circle cx={particula.telaX} cy={particula.telaY} r="9" fill={corParticula} opacity="0.1" />
          <circle cx={particula.telaX} cy={particula.telaY} r="5.5" fill={corParticula} stroke="#fff" strokeWidth="2" />
          <g transform={`translate(${rotuloX} ${rotuloY})`}>
            <rect width={larguraRotulo} height="29" rx="4" fill="#fff" fillOpacity="0.95" stroke="#e7eceb" />
            <circle cx="12" cy="14.5" r="2.5" fill={corParticula} />
            <text x="23" y="19" fontSize="11" fill="#53655d" fontFamily={FONTE_NUMEROS}>({formatarCoordenada(particula.x, 2)}; {formatarCoordenada(particula.y, 2)}) m</text>
          </g>
        </>}
        {modoDesenho && <rect x={esquerda} y={topo} width={larguraUtil} height={alturaUtil} fill="transparent" stroke={COR_CURVA} strokeOpacity="0.45" strokeDasharray="6 6" />}
      </svg>
    </div>
  );
}

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.min(Math.max(valor, minimo), maximo);
}

function criarMarcas(minimo: number, maximo: number, quantidade: number) {
  const intervalo = maximo - minimo;
  if (!(intervalo > 0) || !Number.isFinite(intervalo)) return { principais: [], secundarias: [] };
  const alvo = intervalo / quantidade;
  const potencia = 10 ** Math.floor(Math.log10(alvo));
  const fator = alvo / potencia;
  const passo = (fator <= 1 ? 1 : fator <= 2 ? 2 : fator <= 2.5 ? 2.5 : fator <= 5 ? 5 : 10) * potencia;
  const principais: number[] = [];
  const secundarias: number[] = [];
  for (let i = Math.ceil(minimo / (passo / 2)); i <= Math.floor(maximo / (passo / 2)); i += 1) {
    const valor = Number((i * passo / 2).toPrecision(12));
    (i % 2 === 0 ? principais : secundarias).push(valor);
  }
  return { principais, secundarias };
}

function criarCaminhoDesenho(pontos: PontoDesenhado[], trajetoria: DadosTrajetoria, configuracao: ConfiguracaoSimulacao) {
  if (pontos.length < 2) return "";
  return pontos.map((ponto, indice) => {
    const tela = converterMundoParaTela(ponto.x, ponto.y, trajetoria.limites, configuracao);
    return `${indice === 0 ? "M" : "L"} ${tela.x.toFixed(2)} ${tela.y.toFixed(2)}`;
  }).join(" ");
}
