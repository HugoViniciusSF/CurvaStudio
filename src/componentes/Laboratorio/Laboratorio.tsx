import { useMemo, useRef, useState } from "react";
import { Button, MenuItem, Select } from "@mui/material";
import type { ModeloCurva } from "../../tipos/ModeloCurva";
import type { ConfiguracaoSimulacao } from "../../tipos/ConfiguracaoSimulacao";
import type { EstadoSimulacao } from "../../tipos/EstadoSimulacao";
import { configuracaoPadrao } from "../../simulacao/configuracaoPadrao";
import { modelosPadrao } from "../../simulacao/modelosPadrao";
import { gerarTrajetoria } from "../../simulacao/gerarTrajetoria";
import { validarModelo } from "../../simulacao/validarModelo";
import { criarFuncaoPorExpressao } from "../../simulacao/avaliadorFuncao";
import { criarFuncaoDesenhada, type PontoDesenhado } from "../../simulacao/funcaoDesenhada";
import { INTERVALO_AMOSTRAGEM_PADRAO, useSimulacao } from "../../ganchos/useSimulacao";
import { EditorConfiguracao, CampoNumero } from "../EditorConfiguracao/EditorConfiguracao";
import { EditorFuncao } from "../EditorFuncao/EditorFuncao";
import { VisualizadorTrajetoria } from "../VisualizadorTrajetoria/VisualizadorTrajetoria";
import { Icone } from "../Icone";
import { ControlesSimulacao } from "./ControlesSimulacao";
import { DialogoRoteiros } from "./DialogoRoteiros";
import { PainelAnalise } from "./PainelAnalise";
import { PainelGrandezas } from "./PainelGrandezas";
import type { RoteiroEstudo } from "./roteiros";

const ROTULOS_ESTADO: Record<EstadoSimulacao, string> = {
  PRONTO: "Pronto para iniciar",
  EM_EXECUCAO: "Em execução",
  PAUSADO: "Pausado",
  LIMITE_FINAL: "Limite final atingido",
  ENCERRADO: "Movimento encerrado",
};

export function Laboratorio() {
  const [modelos, setModelos] = useState<ModeloCurva[]>(modelosPadrao);
  const [configuracao, setConfiguracao] = useState(configuracaoPadrao);
  const [idSelecionado, setIdSelecionado] = useState(modelosPadrao[0].id);
  const [modoDesenho, setModoDesenho] = useState(false);
  const [pontosDesenho, setPontosDesenho] = useState<PontoDesenhado[]>([]);
  const pontosDesenhoRef = useRef<PontoDesenhado[]>([]);
  const [taxaTempo, setTaxaTempo] = useState(1);
  const [intervaloRegistro, setIntervaloRegistro] = useState<number>(INTERVALO_AMOSTRAGEM_PADRAO);
  const [mostrarGrade, setMostrarGrade] = useState(true);
  const [mostrarTangente, setMostrarTangente] = useState(false);
  const [mostrarVetor, setMostrarVetor] = useState(false);
  const [corParticula, setCorParticula] = useState(modelosPadrao[0].cor);
  const [roteirosAbertos, setRoteirosAbertos] = useState(false);
  const [erroInterface, setErroInterface] = useState("");
  const [roteiroAtivo, setRoteiroAtivo] = useState<RoteiroEstudo | null>(null);

  const modeloSelecionado = modelos.find((modelo) => modelo.id === idSelecionado) ?? modelos[0];
  const trajetoria = useMemo(
    () => gerarTrajetoria(modeloSelecionado, configuracao),
    [modeloSelecionado, configuracao],
  );
  const {
    estado, particula, metricas, iniciar, reiniciar, pausar,
    passo, tempo, historico, exportarCSV, erro,
  } = useSimulacao(modeloSelecionado, trajetoria, configuracao, taxaTempo, intervaloRegistro);

  const emExecucao = estado === "EM_EXECUCAO";
  const encerrado = estado === "LIMITE_FINAL" || estado === "ENCERRADO";
  const retornouAoInicio = estado === "ENCERRADO"
    && particula.x <= configuracao.dominio.minimo + 1e-8
    && particula.velocidade < 0;
  const mensagemErro = erroInterface || erro;
  const mensagemExperimento = retornouAoInicio
    ? "Retorno ao limite inicial. Prepare um novo ensaio."
    : estado === "ENCERRADO"
      ? "A partícula atingiu repouso."
      : estado === "LIMITE_FINAL"
        ? "Fim do domínio. Os dados estão disponíveis para análise."
        : "Partícula confinada · Referencial de energia potencial: y = 0";

  function validarModeloNaInterface(modelo: ModeloCurva, parametros = configuracao) {
    try {
      validarModelo(modelo, parametros);
      setErroInterface("");
      return true;
    } catch (erroValidacao) {
      setErroInterface(erroValidacao instanceof Error
        ? erroValidacao.message
        : "O modelo não é válido no domínio escolhido.");
      return false;
    }
  }

  function salvarModelo(atualizado: ModeloCurva) {
    if (!validarModeloNaInterface(atualizado)) return false;
    setModelos((atuais) => atuais.map((modelo) => modelo.id === atualizado.id ? atualizado : modelo));
    return true;
  }

  function selecionarModelo(id: string) {
    const proximo = modelos.find((modelo) => modelo.id === id);
    if (!proximo || !validarModeloNaInterface(proximo)) return;
    setIdSelecionado(id);
    setModoDesenho(false);
  }

  function alterarConfiguracao(nova: ConfiguracaoSimulacao) {
    if (JSON.stringify(nova) === JSON.stringify(configuracao)) return true;
    if (!validarModeloNaInterface(modeloSelecionado, nova)) return false;
    setConfiguracao(nova);
    return true;
  }

  function criarModelo() {
    const modelo: ModeloCurva = {
      id: `funcao-${crypto.randomUUID()}`,
      nome: "Modelo personalizado",
      expressao: "sen(x)",
      descricao: "Trajetória definida por uma expressão matemática.",
      cor: "#246f60",
      calcular: criarFuncaoPorExpressao("sen(x)"),
    };
    setModelos((atuais) => [...atuais, modelo]);
    setIdSelecionado(modelo.id);
    setModoDesenho(false);
    setErroInterface("");
  }

  function excluirModelo() {
    if (modelos.length <= 1) return;
    const restantes = modelos.filter((modelo) => modelo.id !== modeloSelecionado.id);
    const proximo = restantes.find((modelo) => {
      try {
        validarModelo(modelo, configuracao);
        return true;
      } catch {
        return false;
      }
    });
    if (!proximo) {
      setErroInterface("Ajuste o domínio ou os parâmetros físicos para selecionar outro modelo antes de excluir este.");
      return;
    }
    setModelos(restantes);
    setIdSelecionado(proximo.id);
    setModoDesenho(false);
    setErroInterface("");
  }

  function limparDesenho() {
    pontosDesenhoRef.current = [];
    setPontosDesenho([]);
  }

  function alternarDesenho() {
    pausar();
    setModoDesenho((ativo) => !ativo);
    limparDesenho();
    setErroInterface("");
  }

  function adicionarPonto(ponto: PontoDesenhado) {
    const ultimo = pontosDesenhoRef.current.at(-1);
    if (ultimo && Math.hypot(ponto.x - ultimo.x, ponto.y - ultimo.y) < 0.035) return;
    pontosDesenhoRef.current = [...pontosDesenhoRef.current, ponto];
    setPontosDesenho(pontosDesenhoRef.current);
  }

  function finalizarDesenho() {
    const modelo = criarFuncaoDesenhada(pontosDesenhoRef.current);
    if (!modelo) {
      setErroInterface("Arraste por uma extensão maior do gráfico para capturar pelo menos quatro posições em x.");
      return;
    }
    if (!validarModeloNaInterface(modelo)) return;
    setModelos((atuais) => [...atuais, modelo]);
    setIdSelecionado(modelo.id);
    setModoDesenho(false);
    limparDesenho();
  }

  function exportarDados() {
    const blob = new Blob(["\uFEFF", exportarCSV()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `curva-experimento-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function carregarRoteiro(roteiro: RoteiroEstudo) {
    const base = modelosPadrao.find((modelo) => modelo.id === roteiro.modeloId);
    if (!base) return;
    const modelo = { ...base, id: `roteiro-${roteiro.id}` };
    setModelos((atuais) => [...atuais.filter((atual) => atual.id !== modelo.id), modelo]);
    setIdSelecionado(modelo.id);
    setConfiguracao({
      ...configuracaoPadrao,
      coeficienteAtrito: roteiro.coeficienteAtrito,
      gravidade: roteiro.gravidade,
      velocidadeInicial: roteiro.velocidadeInicial,
    });
    setTaxaTempo(1);
    setModoDesenho(false);
    setErroInterface("");
    setRoteiroAtivo(roteiro);
    setRoteirosAbertos(false);
  }

  function abrirRoteiros() {
    pausar();
    setRoteirosAbertos(true);
  }

  function executar() {
    if (encerrado) reiniciar();
    else if (emExecucao) pausar();
    else iniciar();
  }

  function reiniciarExperimento() {
    reiniciar();
    setErroInterface("");
  }

  return (
    <div className="lab-app">
      <a className="skip-link" href="#experimento">Ir para o experimento</a>
      <header className="app-header">
        <a href="#experimento" className="brand" aria-label="Curva — laboratório de dinâmica">
          <span className="brand-mark">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M5 8v18h22M7 12c5 0 4 10 10 10S22 6 27 6" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <strong>curva<span>.</span></strong>
          <span className="brand-description">laboratório de dinâmica</span>
        </a>
        <nav className="header-nav" aria-label="Navegação principal">
          <button className="nav-active" onClick={() => setRoteirosAbertos(false)}>
            <Icone nome="flask" />Laboratório
          </button>
          <button onClick={abrirRoteiros}><Icone nome="book" />Roteiros de estudo</button>
        </nav>
        <Button
          className="export-button"
          variant="outlined"
          startIcon={<Icone nome="download" size={16} />}
          disabled={historico.length < 2}
          onClick={exportarDados}
        >
          Exportar dados
        </Button>
      </header>
      <div className="lab-layout">
        <aside className="settings-panel" aria-label="Configuração do experimento">
          <div className="settings-heading"><Icone nome="settings" /><h2>Configurar experimento</h2></div>
          <section className="settings-section">
            <div className="section-label"><span>01</span><h3>Modelo matemático</h3></div>
            <Select
              fullWidth
              size="small"
              value={modeloSelecionado.id}
              onChange={(evento) => selecionarModelo(evento.target.value)}
              inputProps={{ "aria-label": "Modelo matemático" }}
            >
              {modelos.map((modelo) => <MenuItem key={modelo.id} value={modelo.id}>{modelo.nome}</MenuItem>)}
            </Select>
            <EditorFuncao
              funcao={modeloSelecionado}
              dominio={configuracao.dominio}
              podeExcluir={modelos.length > 1}
              aoSalvar={salvarModelo}
              aoCriar={criarModelo}
              aoExcluir={excluirModelo}
            />
            <div className="domain-fields">
              <span className="field-label">Domínio de análise</span>
              <div className="two-fields">
                <CampoNumero
                  label="x inicial"
                  unidade="m"
                  value={configuracao.dominio.minimo}
                  min={-100}
                  max={configuracao.dominio.maximo - 0.1}
                  step={0.5}
                  onChange={(minimo) => alterarConfiguracao({
                    ...configuracao,
                    dominio: { ...configuracao.dominio, minimo },
                  })}
                />
                <CampoNumero
                  label="x final"
                  unidade="m"
                  value={configuracao.dominio.maximo}
                  min={configuracao.dominio.minimo + 0.1}
                  max={100}
                  step={0.5}
                  onChange={(maximo) => alterarConfiguracao({
                    ...configuracao,
                    dominio: { ...configuracao.dominio, maximo },
                  })}
                />
              </div>
            </div>
          </section>
          <section className="settings-section">
            <div className="section-label"><span>02</span><h3>Parâmetros físicos</h3></div>
            <EditorConfiguracao configuracao={configuracao} aoAlterar={alterarConfiguracao} />
          </section>
        </aside>
        <main className="experiment" id="experimento">
          <div className="page-heading">
            <div>
              <p className="eyebrow">MECÂNICA CLÁSSICA <span>/</span> LABORATÓRIO VIRTUAL</p>
              <h1>Dinâmica em curvas</h1>
              <p>Explore a relação entre trajetória, movimento e energia.</p>
            </div>
          </div>
          {roteiroAtivo && (
            <div className="study-banner">
              <Icone nome="book" />
              <div><strong>{roteiroAtivo.titulo}</strong><p>{roteiroAtivo.pergunta}</p></div>
              <button aria-label="Fechar orientação do roteiro" onClick={() => setRoteiroAtivo(null)}>
                <Icone nome="close" size={16} />
              </button>
            </div>
          )}
          {mensagemErro && (
            <div className="error-banner" role="alert">
              <Icone nome="info" />
              <span>{mensagemErro}</span>
              {erroInterface && (
                <button aria-label="Fechar mensagem" onClick={() => setErroInterface("")}>
                  <Icone nome="close" size={16} />
                </button>
              )}
            </div>
          )}
          <section className="plot-panel" aria-label="Experimento de dinâmica">
            <div className="plot-heading">
              <div className="plot-title">
                <span className="series-dot" style={{ background: modeloSelecionado.cor }} />
                <h2>Trajetória da partícula</h2>
                <span className="plot-expression">f(x) = {modeloSelecionado.expressao}</span>
              </div>
              <span className={`status-badge ${emExecucao ? "is-running" : ""}`} role="status">
                <span />{ROTULOS_ESTADO[estado]}
              </span>
            </div>
            <div className="plot-options">
              <div className="view-toggles">
                <button aria-pressed={mostrarGrade} onClick={() => setMostrarGrade((ativo) => !ativo)}>
                  <Icone nome="grid" size={14} />Grade
                </button>
                <button aria-pressed={mostrarTangente} onClick={() => setMostrarTangente((ativo) => !ativo)}>
                  Tangente
                </button>
                <button aria-pressed={mostrarVetor} onClick={() => setMostrarVetor((ativo) => !ativo)}>
                  Vetor velocidade
                </button>
              </div>
              <button className="draw-button" aria-pressed={modoDesenho} onClick={alternarDesenho}>
                <Icone nome="pen" size={14} />{modoDesenho ? "Cancelar desenho" : "Desenhar curva"}
              </button>
            </div>
            {modoDesenho && (
              <div className="drawing-note">
                Arraste no gráfico para traçar y = f(x). Cada posição x terá uma única altura;
                fora do traçado, a altura das extremidades é mantida.
              </div>
            )}
            <VisualizadorTrajetoria
              corParticula={corParticula}
              aoAlterarCorParticula={setCorParticula}
              particula={particula}
              configuracao={configuracao}
              funcaoSelecionada={modeloSelecionado}
              modoDesenho={modoDesenho}
              pontosDesenho={pontosDesenho}
              trajetoria={trajetoria}
              mostrarGrade={mostrarGrade}
              mostrarTangente={mostrarTangente}
              mostrarVetor={mostrarVetor}
              aoAdicionarPontoDesenho={adicionarPonto}
              aoFinalizarDesenho={finalizarDesenho}
              aoIniciarDesenho={limparDesenho}
            />
            <ControlesSimulacao
              estado={estado}
              modoDesenho={modoDesenho}
              taxaTempo={taxaTempo}
              tempo={tempo}
              aoExecutar={executar}
              aoReiniciar={reiniciarExperimento}
              aoAvancarPasso={passo}
              aoAlterarTaxaTempo={setTaxaTempo}
            />
            <div className="experiment-foot"><span>{mensagemExperimento}</span></div>
          </section>
          <PainelGrandezas metricas={metricas} />
          <PainelAnalise
            historico={historico}
            intervaloRegistro={intervaloRegistro}
            aoAlterarIntervalo={setIntervaloRegistro}
          />
          <footer className="workspace-footer">
            <span>© 2026 CURVA <span> / </span> Todos os direitos reservados</span>
            <span>Unidades SI · Simulação numérica aproximada</span>
          </footer>
        </main>
      </div>
      <DialogoRoteiros
        aberto={roteirosAbertos}
        aoFechar={() => setRoteirosAbertos(false)}
        aoCarregar={carregarRoteiro}
      />
    </div>
  );
}
