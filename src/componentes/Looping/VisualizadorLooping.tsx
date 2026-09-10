import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Ponto3D } from "../../simulacao/looping3d";
import "./VisualizadorLooping.css";

interface PropriedadesVisualizadorLooping {
  pontos: Ponto3D[];
  posicao: Ponto3D;
  corParticula: string;
  modo: "orbitar" | "desenhar" | "selecionar";
  profundidadeDesenho: number;
  indiceSelecionado: number | null;
  aoSelecionarPonto: (indice: number) => void;
  aoDesenhar: (pontos: Ponto3D[]) => void;
}

interface Camera {
  azimute: number;
  elevacao: number;
}

interface PontoProjetado {
  x: number;
  y: number;
  profundidade: number;
}

const LARGURA = 900;
const ALTURA = 520;
const CAMERA_ISOMETRICA: Camera = { azimute: -Math.PI / 4, elevacao: Math.atan(1 / Math.sqrt(2)) };
const CAMERA_FRONTAL: Camera = { azimute: 0, elevacao: 0 };
const CAMERA_LATERAL: Camera = { azimute: Math.PI / 2, elevacao: 0 };
const MAXIMO_PONTOS_DESENHO = 1_000;
const LIMITE_COORDENADA = 100;
const formatador = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.min(maximo, Math.max(minimo, valor));
}

function projetarRotacao(ponto: Ponto3D, centro: Ponto3D, camera: Camera): PontoProjetado {
  const x = ponto.x - centro.x;
  const y = ponto.y - centro.y;
  const z = ponto.z - centro.z;
  const longitudinal = Math.sin(camera.azimute) * x + Math.cos(camera.azimute) * z;
  return {
    x: Math.cos(camera.azimute) * x - Math.sin(camera.azimute) * z,
    y: Math.cos(camera.elevacao) * y - Math.sin(camera.elevacao) * longitudinal,
    profundidade: Math.sin(camera.elevacao) * y + Math.cos(camera.elevacao) * longitudinal,
  };
}

function criarMarcas(minimo: number, maximo: number, quantidade = 7) {
  const passoBruto = (maximo - minimo) / quantidade;
  const ordem = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = [1, 2, 5, 10].find((valor) => valor * ordem >= passoBruto)! * ordem;
  const marcas: number[] = [];
  for (let indice = Math.ceil(minimo / passo); indice <= Math.floor(maximo / passo); indice += 1) {
    marcas.push(indice * passo);
  }
  return marcas;
}

function IconeVista({ tipo }: { tipo: "isometrica" | "frontal" | "lateral" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {tipo === "isometrica" ? (
        <path d="m10 2 7 4v8l-7 4-7-4V6l7-4Zm0 8 7-4M10 10 3 6m7 4v8" />
      ) : tipo === "frontal" ? (
        <><path d="M4 3h12v14H4z" /><path d="M7 14V6m0 8h6" /></>
      ) : (
        <><path d="m6 3 8 3v11l-8-3V3Z" /><path d="M9 12V7m0 5 3 1" /></>
      )}
    </svg>
  );
}

/** Projeção ortográfica: as três coordenadas permanecem em metros, com escala uniforme. */
export function VisualizadorLooping({
  pontos,
  posicao,
  corParticula,
  modo,
  profundidadeDesenho,
  indiceSelecionado,
  aoSelecionarPonto,
  aoDesenhar,
}: PropriedadesVisualizadorLooping) {
  const id = useId().replace(/:/g, "");
  const [camera, definirCamera] = useState<Camera>(CAMERA_ISOMETRICA);
  const [zoom, definirZoom] = useState(1);
  const [rascunho, definirRascunho] = useState<Ponto3D[]>([]);
  const [mensagem, definirMensagem] = useState("");
  const svg = useRef<SVGSVGElement>(null);
  const ponteiro = useRef<{ id: number; x: number; y: number; camera: Camera } | null>(null);
  const desenho = useRef<Ponto3D[]>([]);
  const cameraAtiva = modo === "desenhar" ? CAMERA_FRONTAL : camera;

  useEffect(() => {
    definirRascunho([]);
    definirMensagem("");
    return () => {
      const ativo = ponteiro.current;
      ponteiro.current = null;
      desenho.current = [];
      if (ativo && svg.current?.hasPointerCapture(ativo.id)) svg.current.releasePointerCapture(ativo.id);
    };
  }, [modo, profundidadeDesenho, pontos]);

  const limites = useMemo(() => {
    const minimo = { x: 0, y: 0, z: -1 };
    const maximo = { x: 0, y: 0, z: 1 };
    for (const ponto of pontos) {
      for (const eixo of ["x", "y", "z"] as const) {
        minimo[eixo] = Math.min(minimo[eixo], ponto[eixo]);
        maximo[eixo] = Math.max(maximo[eixo], ponto[eixo]);
      }
    }
    for (const eixo of ["x", "y", "z"] as const) {
      const folga = Math.max((maximo[eixo] - minimo[eixo]) * 0.08, 1);
      minimo[eixo] -= folga;
      maximo[eixo] += folga;
    }
    const centro = {
      x: (minimo.x + maximo.x) / 2,
      y: (minimo.y + maximo.y) / 2,
      z: (minimo.z + maximo.z) / 2,
    };
    return { minimo, maximo, centro };
  }, [pontos]);

  const projecao = useMemo(() => {
    const vertices: PontoProjetado[] = [];
    for (const x of [limites.minimo.x, limites.maximo.x]) {
      for (const y of [limites.minimo.y, limites.maximo.y]) {
        for (const z of [limites.minimo.z, limites.maximo.z]) {
          vertices.push(projetarRotacao({ x, y, z }, limites.centro, cameraAtiva));
        }
      }
    }
    const extensaoX = Math.max(...vertices.map((ponto) => Math.abs(ponto.x))) * 2;
    const extensaoY = Math.max(...vertices.map((ponto) => Math.abs(ponto.y))) * 2;
    const escala = Math.min((LARGURA - 150) / extensaoX, (ALTURA - 130) / extensaoY) * zoom;
    return {
      escala,
      ponto(ponto: Ponto3D): PontoProjetado {
        const rotacionado = projetarRotacao(ponto, limites.centro, cameraAtiva);
        return {
          x: LARGURA / 2 + rotacionado.x * escala,
          y: ALTURA / 2 - rotacionado.y * escala,
          profundidade: rotacionado.profundidade,
        };
      },
    };
  }, [limites, cameraAtiva, zoom]);

  const projetados = useMemo(() => pontos.map(projecao.ponto), [pontos, projecao]);
  const posicaoProjetada = projecao.ponto(posicao);
  const camadasTrajetoria = useMemo(() => {
    const profundidades = projetados.map((ponto) => ponto.profundidade);
    const minimo = Math.min(...profundidades);
    const amplitude = Math.max(...profundidades) - minimo;
    return projetados.slice(1).map((fim, indice) => {
      const inicio = projetados[indice];
      const profundidade = (inicio.profundidade + fim.profundidade) / 2;
      const luminosidade = amplitude > 0 ? 58 - 25 * ((profundidade - minimo) / amplitude) : 38;
      return {
        profundidade,
        elemento: <line
          key={`segmento-${indice}`}
          className="loop-vista-segmento"
          x1={inicio.x}
          y1={inicio.y}
          x2={fim.x}
          y2={fim.y}
          stroke={`hsl(160 28% ${luminosidade}%)`}
          strokeWidth={3.2}
        />,
      };
    }).sort((a, b) => a.profundidade - b.profundidade);
  }, [projetados]);
  const indiceParticula = camadasTrajetoria.findIndex((camada) => camada.profundidade > posicaoProjetada.profundidade);
  const camadas = camadasTrajetoria.map((camada) => camada.elemento);
  camadas.splice(indiceParticula < 0 ? camadas.length : indiceParticula, 0,
    <g key="particula" className="loop-vista-particula">
      <circle cx={posicaoProjetada.x} cy={posicaoProjetada.y} r={12} fill={corParticula} opacity={0.12} />
      <circle cx={posicaoProjetada.x} cy={posicaoProjetada.y} r={7} fill={corParticula} stroke="#fff" strokeWidth={2.5} />
    </g>);
  const marcasX = useMemo(() => criarMarcas(limites.minimo.x, limites.maximo.x), [limites]);
  const marcasY = useMemo(() => criarMarcas(limites.minimo.y, limites.maximo.y, 5), [limites]);
  const marcasZ = useMemo(() => criarMarcas(limites.minimo.z, limites.maximo.z, 5), [limites]);
  const origem = projecao.ponto({ x: 0, y: 0, z: 0 });
  const eixos = (["x", "y", "z"] as const).map((eixo) => ({
    eixo,
    fim: projecao.ponto({ x: 0, y: 0, z: 0, [eixo]: limites.maximo[eixo] }),
  }));
  const caminhoRascunho = rascunho.map((ponto, indice) => {
    const tela = projecao.ponto(ponto);
    return `${indice === 0 ? "M" : "L"}${tela.x},${tela.y}`;
  }).join(" ");
  const vistaFrontal = cameraAtiva.azimute === 0 && cameraAtiva.elevacao === 0;
  const vistaLateral = cameraAtiva.azimute === Math.PI / 2 && cameraAtiva.elevacao === 0;
  const vistaIsometrica = cameraAtiva.azimute === CAMERA_ISOMETRICA.azimute
    && cameraAtiva.elevacao === CAMERA_ISOMETRICA.elevacao;
  const indiceAtivo = indiceSelecionado !== null && Number.isInteger(indiceSelecionado)
    && indiceSelecionado >= 0 && indiceSelecionado < pontos.length ? indiceSelecionado : null;
  const pontoSelecionado = indiceAtivo === null ? undefined : pontos[indiceAtivo];

  function pontoDoEvento(evento: PointerEvent<SVGSVGElement>) {
    const matriz = evento.currentTarget.getScreenCTM();
    if (!matriz) return null;
    const ponto = evento.currentTarget.createSVGPoint();
    ponto.x = evento.clientX;
    ponto.y = evento.clientY;
    return ponto.matrixTransform(matriz.inverse());
  }

  function adicionarPonto(evento: PointerEvent<SVGSVGElement>, obrigatorio = false) {
    const tela = pontoDoEvento(evento);
    if (!tela) return;
    const ponto = {
      x: limitar((limitar(tela.x, 20, LARGURA - 20) - LARGURA / 2) / projecao.escala + limites.centro.x, -LIMITE_COORDENADA, LIMITE_COORDENADA),
      y: limitar((ALTURA / 2 - limitar(tela.y, 20, ALTURA - 20)) / projecao.escala + limites.centro.y, -LIMITE_COORDENADA, LIMITE_COORDENADA),
      z: limitar(profundidadeDesenho, -LIMITE_COORDENADA, LIMITE_COORDENADA),
    };
    const anterior = desenho.current.at(-1);
    const distancia = anterior ? Math.hypot(ponto.x - anterior.x, ponto.y - anterior.y) * projecao.escala : Infinity;
    if (distancia < (obrigatorio ? 0.5 : 4) || desenho.current.length >= MAXIMO_PONTOS_DESENHO) return;
    desenho.current.push(ponto);
    definirRascunho([...desenho.current]);
  }

  function iniciarPonteiro(evento: PointerEvent<SVGSVGElement>) {
    if (evento.button !== 0 || !evento.isPrimary || ponteiro.current) return;
    evento.currentTarget.focus();
    definirMensagem("");
    if (modo === "selecionar") {
      const tela = pontoDoEvento(evento);
      if (!tela) return;
      let indiceProximo = -1;
      let distanciaMinima = 22;
      for (let indice = 0; indice < projetados.length; indice += 1) {
        const ponto = projetados[indice];
        const distancia = Math.hypot(ponto.x - tela.x, ponto.y - tela.y);
        if (distancia < distanciaMinima) {
          distanciaMinima = distancia;
          indiceProximo = indice;
        }
      }
      if (indiceProximo >= 0) aoSelecionarPonto(indiceProximo);
      return;
    }
    evento.preventDefault();
    ponteiro.current = { id: evento.pointerId, x: evento.clientX, y: evento.clientY, camera };
    evento.currentTarget.setPointerCapture(evento.pointerId);
    if (modo === "desenhar") {
      desenho.current = [];
      definirRascunho([]);
      adicionarPonto(evento, true);
    }
  }

  function moverPonteiro(evento: PointerEvent<SVGSVGElement>) {
    const ativo = ponteiro.current;
    if (!ativo || ativo.id !== evento.pointerId) return;
    evento.preventDefault();
    if (modo === "desenhar") adicionarPonto(evento);
    if (modo === "orbitar") {
      definirCamera({
        azimute: ativo.camera.azimute - (evento.clientX - ativo.x) * 0.008,
        elevacao: limitar(ativo.camera.elevacao + (evento.clientY - ativo.y) * 0.006, -1.25, 1.25),
      });
    }
  }

  function concluirPonteiro(evento: PointerEvent<SVGSVGElement>, cancelar = false) {
    if (ponteiro.current?.id !== evento.pointerId) return;
    ponteiro.current = null;
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) evento.currentTarget.releasePointerCapture(evento.pointerId);
    if (modo !== "desenhar") return;
    if (!cancelar) adicionarPonto(evento, true);
    const novosPontos = desenho.current;
    desenho.current = [];
    definirRascunho([]);
    if (cancelar) return;
    if (novosPontos.length >= 4) {
      aoDesenhar(novosPontos);
    } else {
      definirMensagem("Faça um traço mais longo para definir a trajetória; são necessários ao menos 4 pontos.");
    }
  }

  function usarTeclado(evento: KeyboardEvent<SVGSVGElement>) {
    if (evento.key === "Escape" && ponteiro.current) {
      evento.preventDefault();
      const ativo = ponteiro.current;
      ponteiro.current = null;
      desenho.current = [];
      definirRascunho([]);
      if (evento.currentTarget.hasPointerCapture(ativo.id)) evento.currentTarget.releasePointerCapture(ativo.id);
      if (modo === "desenhar") definirMensagem("Desenho cancelado.");
      return;
    }
    const incremento = evento.key === "ArrowRight" || evento.key === "ArrowUp" ? 1 : -1;
    if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(evento.key)) return;
    if (modo === "selecionar" && pontos.length > 0) {
      evento.preventDefault();
      aoSelecionarPonto(limitar((indiceAtivo ?? (incremento > 0 ? -1 : pontos.length)) + incremento, 0, pontos.length - 1));
    }
    if (modo === "orbitar") {
      evento.preventDefault();
      definirCamera((atual) => evento.key === "ArrowRight" || evento.key === "ArrowLeft"
        ? { ...atual, azimute: atual.azimute + incremento * 0.1 }
        : { ...atual, elevacao: limitar(atual.elevacao + incremento * 0.1, -1.25, 1.25) });
    }
  }

  function desenharLinha(inicio: Ponto3D, fim: Ponto3D) {
    const a = projecao.ponto(inicio);
    const b = projecao.ponto(fim);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  }

  const instrucao = modo === "desenhar"
    ? `Trace a trajetória na vista frontal. Todos os pontos novos terão z = ${formatador.format(profundidadeDesenho)} m.`
    : modo === "selecionar"
      ? "Clique em um nó para editar x, y e z. Use as setas do teclado para percorrer os pontos."
      : "Arraste para girar a vista. As setas do teclado também controlam a câmera.";

  return (
    <div className="loop-visualizador">
      <div className="loop-vista-toolbar">
        <div className="loop-vista-legenda">
          <span><i className="loop-vista-amostra-linha" />Trajetória 3D</span>
          <span><i className="loop-vista-amostra-particula" style={{ backgroundColor: corParticula }} />Partícula</span>
        </div>
        <div className="loop-vista-botoes" role="group" aria-label="Vista da trajetória">
          <button type="button" title="Vista isométrica" aria-label="Vista isométrica" aria-pressed={vistaIsometrica} disabled={modo === "desenhar"} onClick={() => definirCamera(CAMERA_ISOMETRICA)}>
            <IconeVista tipo="isometrica" /><span>Isométrica</span>
          </button>
          <button type="button" title="Vista frontal: x e y" aria-label="Vista frontal: x e y" aria-pressed={vistaFrontal} disabled={modo === "desenhar"} onClick={() => definirCamera(CAMERA_FRONTAL)}>
            <IconeVista tipo="frontal" /><span>Frontal</span>
          </button>
          <button type="button" title="Vista lateral: z e y" aria-label="Vista lateral: z e y" aria-pressed={vistaLateral} disabled={modo === "desenhar"} onClick={() => definirCamera(CAMERA_LATERAL)}>
            <IconeVista tipo="lateral" /><span>Lateral</span>
          </button>
        </div>
      </div>

      <div className="loop-vista-canvas">
        <svg
          ref={svg}
          className="loop-vista-svg"
          data-modo={modo}
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          role="img"
          tabIndex={0}
          aria-labelledby={`${id}-titulo ${id}-descricao`}
          onPointerDown={iniciarPonteiro}
          onPointerMove={moverPonteiro}
          onPointerUp={(evento) => concluirPonteiro(evento)}
          onPointerCancel={(evento) => concluirPonteiro(evento, true)}
          onLostPointerCapture={(evento) => concluirPonteiro(evento, true)}
          onKeyDown={usarTeclado}
        >
          <title id={`${id}-titulo`}>Trajetória espacial e posição da partícula</title>
          <desc id={`${id}-descricao`}>
            Projeção ortográfica tridimensional em metros, com o eixo y vertical. {instrucao}
            Partícula em x = {formatador.format(posicao.x)}, y = {formatador.format(posicao.y)} e z = {formatador.format(posicao.z)} metros.
            {pontoSelecionado ? ` Ponto ${indiceAtivo! + 1} selecionado.` : ""}
          </desc>
          <defs>
            <marker id={`${id}-seta`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto-start-reverse">
              <path d="M0 0 5 2.5 0 5Z" fill="#73877e" />
            </marker>
          </defs>
          <g className="loop-vista-grade" aria-hidden="true">
            {marcasX.map((x) => <line key={`x-${x}`} {...desenharLinha({ x, y: 0, z: limites.minimo.z }, { x, y: 0, z: limites.maximo.z })} />)}
            {marcasZ.map((z) => <line key={`z-${z}`} {...desenharLinha({ x: limites.minimo.x, y: 0, z }, { x: limites.maximo.x, y: 0, z })} />)}
            {vistaFrontal && marcasY.map((y) => <line key={`y-${y}`} {...desenharLinha({ x: limites.minimo.x, y, z: 0 }, { x: limites.maximo.x, y, z: 0 })} />)}
            {vistaFrontal && marcasX.map((x) => <line key={`xy-${x}`} {...desenharLinha({ x, y: limites.minimo.y, z: 0 }, { x, y: limites.maximo.y, z: 0 })} />)}
            {vistaLateral && marcasY.map((y) => <line key={`zy-${y}`} {...desenharLinha({ x: 0, y, z: limites.minimo.z }, { x: 0, y, z: limites.maximo.z })} />)}
            {vistaLateral && marcasZ.map((z) => <line key={`yz-${z}`} {...desenharLinha({ x: 0, y: limites.minimo.y, z }, { x: 0, y: limites.maximo.y, z })} />)}
          </g>
          <g className="loop-vista-eixos" aria-hidden="true">
            {eixos.map(({ eixo, fim }) => <line key={eixo} x1={origem.x} y1={origem.y} x2={fim.x} y2={fim.y} markerEnd={`url(#${id}-seta)`} />)}
            <line {...desenharLinha({ x: 0, y: limites.minimo.y, z: 0 }, { x: 0, y: limites.maximo.y, z: 0 })} />
          </g>
          <g opacity={modo === "desenhar" ? 0.36 : 1} aria-hidden="true">{camadas}</g>
          <g className="loop-vista-marcas" aria-hidden="true">
            {marcasX.filter((valor) => valor !== 0 && !vistaLateral).map((x) => {
              const tela = projecao.ponto({ x, y: 0, z: limites.minimo.z });
              return <text key={`x-${x}`} x={tela.x} y={tela.y + 19} textAnchor="middle">{formatador.format(x)}</text>;
            })}
            {marcasY.filter((valor) => valor !== 0).map((y) => {
              const tela = projecao.ponto({ x: 0, y, z: 0 });
              return <text key={`y-${y}`} x={tela.x - 11} y={tela.y + 4} textAnchor="end">{formatador.format(y)}</text>;
            })}
            {marcasZ.filter((valor) => valor !== 0 && !vistaFrontal).map((z) => {
              const tela = projecao.ponto({ x: limites.maximo.x, y: 0, z });
              return <text key={`z-${z}`} x={tela.x + 8} y={tela.y + 16}>{formatador.format(z)}</text>;
            })}
            {eixos.filter(({ eixo }) => !(vistaFrontal && eixo === "z") && !(vistaLateral && eixo === "x")).map(({ eixo, fim }) => (
              <text className="loop-vista-rotulo-eixo" key={eixo} x={fim.x + 10} y={fim.y - 10}>{eixo} (m)</text>
            ))}
          </g>
          {modo === "selecionar" && (
            <g className="loop-vista-nos" aria-hidden="true">
              {projetados.map((ponto, indice) => (
                <circle key={indice} cx={ponto.x} cy={ponto.y} r={indice === indiceAtivo ? 6 : 2.6} data-selecionado={indice === indiceAtivo}>
                  <title>{`Ponto ${indice + 1}: x = ${formatador.format(pontos[indice].x)}, y = ${formatador.format(pontos[indice].y)}, z = ${formatador.format(pontos[indice].z)} m`}</title>
                </circle>
              ))}
            </g>
          )}
          {modo === "desenhar" && caminhoRascunho && <path className="loop-vista-rascunho" d={caminhoRascunho} />}
        </svg>
        <div className="loop-vista-projecao" aria-hidden="true">
          <span>{modo === "desenhar" ? "PLANO DE DESENHO" : "PROJEÇÃO ORTOGRÁFICA"}</span>
          <strong>{modo === "desenhar" ? `z = ${formatador.format(profundidadeDesenho)} m` : "x · y · z"}</strong>
        </div>
        <div className="loop-vista-zoom" role="group" aria-label="Ampliação da vista">
          <button type="button" aria-label="Diminuir ampliação" title="Diminuir ampliação" disabled={zoom <= 0.5} onClick={() => definirZoom((atual) => Math.max(0.5, atual / 1.2))}>−</button>
          <button type="button" className="loop-vista-enquadrar" title="Enquadrar trajetória" onClick={() => definirZoom(1)}>Enquadrar</button>
          <button type="button" aria-label="Aumentar ampliação" title="Aumentar ampliação" disabled={zoom >= 3} onClick={() => definirZoom((atual) => Math.min(3, atual * 1.2))}>+</button>
        </div>
      </div>
      <div className="loop-vista-rodape">
        <p role="status">{mensagem || instrucao}</p>
        {pontoSelecionado && modo === "selecionar" && <span>Ponto {indiceAtivo! + 1} / {pontos.length}</span>}
        {modo === "orbitar" && <span>Escala: metros</span>}
      </div>
    </div>
  );
}
