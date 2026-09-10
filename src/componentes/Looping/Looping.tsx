import { useMemo, useState } from "react";
import { Button } from "@mui/material";
import {
  criarTrajetoriaLooping, prepararTrajetoria3D, duracaoVooLooping, posicaoNoVooLooping, limiteObservacaoLooping,
  type ConfiguracaoLooping, type Ponto3D,
} from "../../simulacao/looping3d";
import { RITMOS_REPRODUCAO } from "../../simulacao/configuracaoPadrao";
import { INTERVALOS_LOOPING, exportarCSVLooping, faseLooping, loopingEncerrado, useLooping } from "../../ganchos/useLooping";
import { formatarCoordenada, formatarNumero } from "../../utilidades/formatacaoNumerica";
import { CampoNumero } from "../EditorConfiguracao/EditorConfiguracao";
import { AnaliseTemporal } from "../AnaliseTemporal/AnaliseTemporal";
import { PainelGrandezas } from "../Laboratorio/PainelGrandezas";
import { Icone } from "../Icone";
import { VisualizadorLooping } from "./VisualizadorLooping";
import "./looping.css";

const GEOMETRIA_INICIAL = { raio: 2, alturaInicial: 6, profundidade: 1.2 };
const FISICA_INICIAL: ConfiguracaoLooping = { massa: 12, gravidade: 9.81, velocidadeInicial: 0, modoContato: "presa" };
const ROTULOS = {
  pronto: "Pronto para iniciar", em_movimento: "Em movimento", concluido: "Fim da trajetória",
  retornou: "Retorno ao início", repouso: "Em repouso",
  desprendida: "Partícula em voo", queda_encerrada: "Observação do voo encerrada",
};

export function Looping({ ativo }: { ativo: boolean }) {
  const [geometria, definirGeometria] = useState(GEOMETRIA_INICIAL);
  const [pontos, definirPontos] = useState(() => criarTrajetoriaLooping(GEOMETRIA_INICIAL));
  const [configuracao, definirConfiguracao] = useState(FISICA_INICIAL);
  const [modo, definirModo] = useState<"orbitar" | "desenhar" | "selecionar">("orbitar");
  const [indiceSelecionado, definirIndiceSelecionado] = useState<number | null>(null);
  const [profundidadeDesenho, definirProfundidadeDesenho] = useState(0);
  const [corParticula, definirCorParticula] = useState("#b58843");
  const [origem, definirOrigem] = useState("Looping com rampa");
  const [aba, definirAba] = useState<"energia" | "velocidade" | "dados">("energia");
  const [erroEdicao, definirErroEdicao] = useState("");
  const trajetoria = useMemo(() => prepararTrajetoria3D(pontos), [pontos]);
  const simulacao = useLooping(trajetoria, configuracao, ativo);
  const { estado, executando, amostras } = simulacao;
  const modoContato = configuracao.modoContato ?? "presa";
  const emVoo = !!estado.desprendimento;
  const enquadramentoVoo = useMemo(() => {
    const evento = estado.desprendimento;
    if (!evento) return undefined;
    const duracao = duracaoVooLooping(trajetoria, configuracao, evento);
    const previsao = Array.from({ length: 41 }, (_, indice) =>
      posicaoNoVooLooping(evento, configuracao.gravidade, duracao * indice / 40));
    const tempoApice = configuracao.gravidade > 0 ? evento.velocidade.y / configuracao.gravidade : -1;
    if (tempoApice > 0 && tempoApice < duracao) previsao.push(posicaoNoVooLooping(evento, configuracao.gravidade, tempoApice));
    return previsao;
  }, [estado.desprendimento, trajetoria, configuracao]);
  const encerrado = loopingEncerrado(estado);
  const pontoSelecionado = indiceSelecionado === null ? undefined : pontos[indiceSelecionado];
  const energiaInicial = configuracao.massa * (configuracao.velocidadeInicial ** 2 / 2 + configuracao.gravidade * pontos[0].y);
  const desvio = estado.energiaMecanica - energiaInicial;
  const metricas = {
    velocidade: estado.velocidade, altura: estado.posicao.y,
    energiaCinetica: estado.energiaCinetica, energiaPotencial: estado.energiaPotencial,
    energiaTotal: estado.energiaMecanica,
  };
  const dadosGrafico = useMemo(() => amostras.map((amostra) => ({
    tempo: amostra.tempo, x: amostra.posicao.x, altura: amostra.posicao.y,
    velocidade: amostra.velocidade, energiaCinetica: amostra.energiaCinetica,
    energiaPotencial: amostra.energiaPotencial, energiaTotal: amostra.energiaMecanica,
  })), [amostras]);

  function aplicarPontos(novos: Ponto3D[], nome: string) {
    try {
      if (novos.some((ponto) => [ponto.x, ponto.y, ponto.z].some((valor) => Math.abs(valor) > 100))) {
        throw new Error("Mantenha as coordenadas x, y e z entre −100 e 100 m. Ajuste o plano de desenho ou a profundidade.");
      }
      const nova = prepararTrajetoria3D(novos);
      definirPontos(nova.pontos);
      definirIndiceSelecionado((indice) => indice === null ? null : Math.min(indice, nova.pontos.length - 1));
      definirOrigem(nome);
      definirErroEdicao("");
      simulacao.pausar();
      return true;
    } catch (erro) {
      definirErroEdicao(erro instanceof Error ? erro.message : "Revise as coordenadas da trajetória.");
      return false;
    }
  }

  function gerarLooping(alturaInicial = geometria.alturaInicial) {
    const novaGeometria = { ...geometria, alturaInicial };
    if (aplicarPontos(criarTrajetoriaLooping(novaGeometria), "Looping com rampa")) {
      definirGeometria(novaGeometria);
      definirIndiceSelecionado(null);
      definirModo("orbitar");
    }
  }

  function carregarCenario(tipo: "completar" | "retornar") {
    gerarLooping(geometria.raio * (tipo === "completar" ? 3 : 1.4));
    definirConfiguracao((anterior) => ({ ...anterior, gravidade: 9.81, velocidadeInicial: 0 }));
  }

  function compararContato(fator: number) {
    const novaGeometria = { ...geometria, alturaInicial: fator * geometria.raio, profundidade: 0 };
    if (!aplicarPontos(criarTrajetoriaLooping(novaGeometria), "Looping com rampa")) return;
    definirGeometria(novaGeometria);
    definirConfiguracao((anterior) => ({ ...anterior, modoContato: "solta", gravidade: 9.81, velocidadeInicial: 0 }));
    definirIndiceSelecionado(null);
    definirModo("orbitar");
  }

  function mudarModo(proximo: typeof modo) {
    simulacao.pausar();
    definirModo(proximo);
    definirErroEdicao("");
  }

  function alterarCoordenada(eixo: keyof Ponto3D, valor: number) {
    if (indiceSelecionado === null) return false;
    return aplicarPontos(pontos.map((ponto, indice) => indice === indiceSelecionado
      ? { ...ponto, [eixo]: valor } : ponto), "Trajetória personalizada");
  }

  function distribuirProfundidade() {
    aplicarPontos(pontos.map((ponto, indice) => {
      const t = trajetoria.comprimentosAcumulados[indice] / trajetoria.comprimentoTotal;
      return { ...ponto, z: profundidadeDesenho + geometria.profundidade * t * t * (3 - 2 * t) };
    }), "Trajetória personalizada");
  }

  function inserirPonto() {
    if (indiceSelecionado === null || pontos.length >= 1000) return;
    const atual = pontos[indiceSelecionado];
    if (!atual) return;
    const proximo = pontos[indiceSelecionado + 1];
    const novo = proximo
      ? { x: (atual.x + proximo.x) / 2, y: (atual.y + proximo.y) / 2, z: (atual.z + proximo.z) / 2 }
      : { ...atual, x: atual.x + 0.5 };
    if (aplicarPontos([...pontos.slice(0, indiceSelecionado + 1), novo, ...pontos.slice(indiceSelecionado + 1)], "Trajetória personalizada")) {
      definirIndiceSelecionado(indiceSelecionado + 1);
    }
  }

  function excluirPonto() {
    if (indiceSelecionado === null || pontos.length <= 4) return;
    if (aplicarPontos(pontos.filter((_, indice) => indice !== indiceSelecionado), "Trajetória personalizada")) {
      definirIndiceSelecionado(Math.min(indiceSelecionado, pontos.length - 2));
    }
  }

  function exportar() {
    const url = URL.createObjectURL(new Blob(["\uFEFF", exportarCSVLooping(amostras)], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `curva-studio-looping-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="loop-page" id="looping">
      <aside className="loop-settings" aria-label="Configuração do looping">
        <div className="loop-section-title"><Icone nome="settings" /><h2>Construir trajetória</h2></div>
        <section className="loop-settings-section">
          <h3>Looping com rampa</h3>
          <p>Defina a geometria e gere uma trajetória em três dimensões.</p>
          <CampoNumero label="Raio do looping" simbolo="R" unidade="m" value={geometria.raio}
            min={0.5} max={10} step={0.1} onChange={(raio) => definirGeometria({ ...geometria, raio })} />
          <div className="loop-two-fields">
            <CampoNumero label="Altura de partida" unidade="m" value={geometria.alturaInicial}
              min={0} max={50} step={0.1} onChange={(alturaInicial) => definirGeometria({ ...geometria, alturaInicial })} />
            <CampoNumero label="Profundidade" unidade="m" value={geometria.profundidade}
              min={0} max={20} step={0.1} onChange={(profundidade) => definirGeometria({ ...geometria, profundidade })} />
          </div>
          <Button fullWidth variant="outlined" onClick={() => gerarLooping()}>Gerar looping</Button>
          <p className="loop-hint">Gerar substitui a trajetória e reinicia os registros desta guia.</p>
        </section>
        <section className="loop-settings-section">
          <h3>Desenho e coordenadas</h3>
          <div className="loop-mode-buttons" role="group" aria-label="Ferramenta da trajetória">
            <button aria-pressed={modo === "orbitar"} onClick={() => mudarModo("orbitar")}>Orbitar</button>
            <button aria-pressed={modo === "desenhar"} onClick={() => mudarModo("desenhar")}>Desenhar</button>
            <button aria-pressed={modo === "selecionar"} onClick={() => mudarModo("selecionar")}>Editar pontos</button>
          </div>
          <CampoNumero label="Plano do desenho" simbolo="z" unidade="m" value={profundidadeDesenho}
            min={-100} max={100} step={0.1} onChange={definirProfundidadeDesenho} />
          <p className="loop-hint">Desenhe livremente em x e y, inclusive voltando sobre x. Para criar profundidade, edite z nos pontos ou distribua o valor de profundidade ao longo do traçado.</p>
          <Button fullWidth variant="outlined" onClick={distribuirProfundidade}>Distribuir profundidade</Button>
          {modo === "selecionar" && (
            <div className="loop-point-editor">
              <label htmlFor="loop-ponto">Ponto da trajetória</label>
              <select id="loop-ponto" value={indiceSelecionado ?? ""}
                onChange={(evento) => definirIndiceSelecionado(evento.target.value === "" ? null : Number(evento.target.value))}>
                <option value="">Selecione no gráfico ou na lista</option>
                {pontos.map((_, indice) => <option key={indice} value={indice}>Ponto {indice + 1}</option>)}
              </select>
              {pontoSelecionado && <>
                <div className="loop-coordinate-fields">
                  {(["x", "y", "z"] as const).map((eixo) => <CampoNumero key={eixo} label={`Coordenada ${eixo}`}
                    unidade="m" value={pontoSelecionado[eixo]} min={-100} max={100} step={0.1}
                    onChange={(valor) => alterarCoordenada(eixo, valor)} />)}
                </div>
                <div className="loop-point-actions">
                  <button onClick={inserirPonto} disabled={pontos.length >= 1000}>Inserir após</button>
                  <button onClick={excluirPonto} disabled={pontos.length <= 4}>Excluir ponto</button>
                </div>
              </>}
            </div>
          )}
        </section>
        <section className="loop-settings-section">
          <h3>Condições físicas</h3>
          <fieldset className="loop-contact-options" aria-describedby="loop-contato-ajuda">
            <legend>Vínculo com a pista</legend>
            <label><input type="radio" name="loop-vinculo" value="presa" checked={modoContato === "presa"}
              onChange={() => definirConfiguracao({ ...configuracao, modoContato: "presa" })} />Presa</label>
            <label><input type="radio" name="loop-vinculo" value="solta" checked={modoContato === "solta"}
              onChange={() => definirConfiguracao({ ...configuracao, modoContato: "solta" })} />Solta</label>
          </fieldset>
          <p id="loop-contato-ajuda">{modoContato === "presa"
            ? "A guia pode empurrar ou puxar a partícula, mantendo-a na trajetória."
            : "A pista só empurra na direção de sustentação. Quando seria necessário puxar, a partícula se desprende e entra em queda livre."}</p>
          <div className="loop-two-fields">
            <CampoNumero label="Massa" simbolo="m" unidade="kg" value={configuracao.massa}
              min={0.01} max={1000} step={0.1} onChange={(massa) => definirConfiguracao({ ...configuracao, massa })} />
            <CampoNumero label="Gravidade" simbolo="g" unidade="m/s²" value={configuracao.gravidade}
              min={0} max={100} step={0.01} onChange={(gravidade) => definirConfiguracao({ ...configuracao, gravidade })} />
          </div>
          <CampoNumero label="Velocidade inicial" simbolo="v₀" unidade="m/s" value={configuracao.velocidadeInicial}
            min={0} max={1000} step={0.1} onChange={(velocidadeInicial) => definirConfiguracao({ ...configuracao, velocidadeInicial })} />
          <p className="loop-hint">Alterar as condições físicas reinicia este ensaio.</p>
        </section>
      </aside>
      <main className="loop-workspace" aria-labelledby="loop-titulo">
        <div className="loop-heading">
          <p className="eyebrow">ESTUDO EM TRÊS DIMENSÕES</p>
          <h1 id="loop-titulo">Looping <span>— Conservação de Energia</span></h1>
          <p>Acompanhe a troca entre altura e velocidade em uma trajetória espacial.</p>
        </div>
        <div className="loop-scenarios" aria-label="Cenários de estudo">
          <button onClick={() => carregarCenario("completar")}><strong>Partida a 3R</strong><span>Estudar a passagem pelo topo no vínculo selecionado</span></button>
          <button onClick={() => carregarCenario("retornar")}><strong>Partida a 1,4R</strong><span>Estudar o efeito de uma menor energia inicial</span></button>
          <button onClick={() => compararContato(2.4)}><strong>Testar 2,4R</strong><span>Solta · looping plano · desprendimento antes do topo</span></button>
          <button onClick={() => compararContato(2.5)}><strong>Testar 2,5R</strong><span>Solta · looping plano · limite de contato no topo</span></button>
        </div>
        <p className="loop-contact-reference">O limite H = 2,5R vale para o looping circular plano, partindo do repouso e sem atrito. Nos dois testes de contato, a profundidade é zero. A curvatura de uma trajetória 3D pode alterar esse limite.</p>
        {(erroEdicao || simulacao.erro) && <div className="error-banner" role="alert"><Icone nome="info" />{erroEdicao || simulacao.erro}</div>}
        <section className="loop-scene-panel" aria-label="Trajetória e reprodução do looping">
          <div className="loop-scene-heading">
            <div><h2>{origem}</h2><span>x · horizontal &nbsp; y · altura &nbsp; z · profundidade</span></div>
            <span className={`status-badge ${executando ? "is-running" : ""}`} role="status"><span />{emVoo
              ? estado.estado === "queda_encerrada" ? ROTULOS.queda_encerrada : executando ? "Partícula em voo" : "Voo pausado"
              : executando ? "Em execução" : estado.estado === "em_movimento" ? "Pausado" : ROTULOS[estado.estado]}</span>
          </div>
          <VisualizadorLooping pontos={pontos} posicao={estado.posicao} corParticula={corParticula}
            rastroVoo={simulacao.rastroVoo} pontoDesprendimento={estado.desprendimento?.posicao} emVoo={emVoo}
            pontosEnquadramento={enquadramentoVoo} limiteObservacao={emVoo ? limiteObservacaoLooping(trajetoria) : undefined}
            modo={modo} profundidadeDesenho={profundidadeDesenho} indiceSelecionado={indiceSelecionado}
            aoSelecionarPonto={definirIndiceSelecionado} aoDesenhar={(novos) => {
              if (aplicarPontos(novos, "Trajetória desenhada")) {
                definirModo("selecionar");
                definirIndiceSelecionado(0);
              }
            }} />
          <div className="loop-scene-footer">
            <label className="loop-particle-color"><input type="color" aria-label="Cor da partícula no looping" value={corParticula}
              onChange={(evento) => definirCorParticula(evento.target.value)} />Partícula</label>
            <span>{pontos.length} pontos · {formatarNumero(trajetoria.comprimentoTotal)} m de trajetória</span>
          </div>
          <div className="loop-transport">
            <div className="loop-playback">
              <Button variant="contained" disabled={modo === "desenhar"} startIcon={<Icone nome={executando ? "pause" : encerrado ? "reset" : "play"} />}
                onClick={simulacao.alternar}>{executando ? "Pausar" : encerrado ? "Preparar novo ensaio" : estado.tempo > 0 ? "Continuar" : "Iniciar looping"}</Button>
              <button className="icon-button" aria-label="Reiniciar looping" title="Reiniciar looping" onClick={simulacao.reiniciar}><Icone nome="reset" /></button>
              <button className="icon-button" aria-label="Avançar um passo no looping" title="Avançar 1/120 s" disabled={executando || encerrado || modo === "desenhar"}
                onClick={simulacao.passo}><Icone nome="step" /></button>
              <label className="speed-control"><span>Ritmo</span><select aria-label="Ritmo do looping" value={simulacao.ritmo}
                onChange={(evento) => simulacao.definirRitmo(Number(evento.target.value))}>
                {RITMOS_REPRODUCAO.map((ritmo) => <option key={ritmo} value={ritmo}>{formatarCoordenada(ritmo)}×</option>)}
              </select></label>
            </div>
            <div className="time-readout"><span>Tempo simulado</span><strong>{formatarNumero(estado.tempo)}<small> s</small></strong></div>
          </div>
          <p className="loop-model-note">{modoContato === "presa" ? "Partícula presa à guia" : "Partícula solta · contato unilateral com apoio lateral ideal"} · sem atrito ou rotação · referência de energia potencial: y = 0</p>
        </section>
        {estado.desprendimento && <div className="loop-detachment-note" role="status">
          <Icone nome="info" /><div><strong>Desprendimento em t = {formatarNumero(estado.desprendimento.tempo, 3)} s</strong>
            <p>Continuar na pista exigiria uma reação de sustentação negativa. A partícula saiu tangente à pista e passou a se mover sob a gravidade, sem novo contato ou colisões com a pista.</p>
            {encerrado && <p>A observação terminou no limite espacial ou temporal do voo. A posição final não representa um impacto.</p>}
          </div>
        </div>}
        <div className="loop-state-details">
          <span>Posição <strong>({formatarNumero(estado.posicao.x)}; {formatarNumero(estado.posicao.y)}; {formatarNumero(estado.posicao.z)}) m</strong></span>
          <span>{emVoo ? "Última coordenada na pista" : "Coordenada ao longo da trajetória"} <strong>s = {formatarNumero(estado.distancia)} m</strong></span>
          <span>{emVoo ? "Reação normal no voo" : "Reação normal de sustentação"}<strong>N = {formatarNumero(estado.forcaNormal)} N</strong></span>
          <span>Variação de Em <strong>{formatarNumero(desvio, 6)} J</strong></span>
        </div>
        <PainelGrandezas metricas={metricas} descricaoVelocidade={emVoo ? "Rapidez no espaço · módulo de (vx, vy, vz)" : "Ao longo da pista · sinal indica o sentido"} />
        <section className="loop-analysis" aria-labelledby="loop-analise-titulo">
          <div className="loop-analysis-heading">
            <h2 id="loop-analise-titulo"><Icone nome="chart" />Evolução temporal</h2>
            <span>{amostras.length} {amostras.length === 1 ? "amostra" : "amostras"}</span>
            <Button variant="outlined" startIcon={<Icone nome="download" size={15} />} disabled={amostras.length < 2} onClick={exportar}>Exportar CSV 3D</Button>
          </div>
          <div className="loop-analysis-controls">
            <div className="loop-analysis-tabs" role="group" aria-label="Dados do looping">
              {(["energia", "velocidade", "dados"] as const).map((valor) => <button key={valor} aria-pressed={aba === valor}
                onClick={() => definirAba(valor)}>{valor === "energia" ? "Energia" : valor === "velocidade" ? "Velocidade" : "Dados 3D"}</button>)}
            </div>
            <label>Intervalo das amostras<select aria-label="Intervalo das amostras do looping" value={simulacao.intervalo}
              onChange={(evento) => simulacao.alterarIntervalo(Number(evento.target.value))}>
              {INTERVALOS_LOOPING.map((intervalo) => <option key={intervalo} value={intervalo}>{formatarCoordenada(intervalo)} s</option>)}
            </select></label>
          </div>
          {aba === "dados" ? <div className="table-scroll">
            <p className="loop-hint">Últimas 8 amostras. O CSV contém toda a série selecionada, incluindo x, y e z.</p>
            <table className="loop-data-table"><thead><tr>{["t (s)", "x (m)", "y (m)", "z (m)", "v (m/s)", "Ec (J)", "Ep (J)", "Em (J)", "N (N)", "Fase"].map((rotulo) => <th key={rotulo}>{rotulo}</th>)}</tr></thead>
              <tbody>{amostras.slice(-8).map((amostra, indice) => <tr key={indice}>{[amostra.tempo, amostra.posicao.x, amostra.posicao.y,
                amostra.posicao.z, amostra.velocidade, amostra.energiaCinetica, amostra.energiaPotencial, amostra.energiaMecanica, amostra.forcaNormal]
                .map((valor, coluna) => <td key={coluna}>{formatarNumero(valor, coluna === 0 ? 3 : 2)}</td>)}
                <td>{faseLooping(amostra) === "pista" ? "Pista" : "Voo"}</td></tr>)}</tbody>
            </table>
          </div> : <AnaliseTemporal historico={dadosGrafico} grandeza={aba} descricaoVelocidade="Velocidade na pista / rapidez no voo" />}
          <p className="loop-hint">O intervalo usa tempo simulado e atualiza também registros anteriores. O início, o desprendimento, o encerramento e os avanços manuais são preservados.</p>
        </section>
        <details className="loop-study-notes">
          <summary>Como interpretar este estudo</summary>
          <p>Na descida, a energia potencial diminui e a cinética aumenta. Na subida, ocorre a transformação inversa. A soma Em = Ec + Ep é preservada pelo método de cálculo, dentro do arredondamento numérico. Sua variação não mede o erro do tempo de percurso nem da geometria.</p>
          <p>A variação de z ao longo da trajetória modifica o percurso e o tempo, mas a energia potencial depende da altura y: Ep = mgy. Na pista, o sentido de v segue a ordem dos pontos; no retorno, o sinal fica negativo. No voo, v indica a rapidez, e Ec usa as três componentes da velocidade.</p>
          <p>No looping gerado, com g &gt; 0 e a partícula presa, basta energia para vencer a subida: H + v₀²/(2g) &gt; 2R. Com a partícula solta em um círculo plano, também é preciso N ≥ 0. No topo, N = m(v²/R − g); para v₀ = 0, o limite é H = 2,5R e v = √(gR). Igualdade no topo é o caso limite; a perda de contato ocorre quando seria necessário N negativo.</p>
          <p>N positivo significa apoio que empurra; N negativo, possível no modo presa, significa tração da guia. No modo solta, depois do desprendimento N = 0 e a trajetória é balística. Não são calculados impactos nem novo contato.</p>
          <p>Em 3D, a superfície de apoio é definida por uma normal transportada desde a orientação inicial, com apoio lateral ideal enquanto há contato. A curvatura e a reação são estimadas a partir dos pontos; o limite 2,5R não é imposto a desenhos livres. Quinas e trajetórias pouco amostradas não reproduzem forças de uma pista suave.</p>
        </details>
      </main>
    </div>
  );
}
