import { useEffect, useState, type FormEvent } from "react";
import { Button, TextField } from "@mui/material";
import type { ModeloCurva } from "../../tipos/ModeloCurva";
import { tentarCriarFuncao } from "../../simulacao/avaliadorFuncao";
import { Icone } from "../Icone";

interface PropriedadesEditorFuncao {
  funcao: ModeloCurva;
  dominio: { minimo: number; maximo: number };
  podeExcluir: boolean;
  aoSalvar: (funcao: ModeloCurva) => boolean;
  aoCriar: () => void;
  aoExcluir: () => void;
}

export function EditorFuncao({
  funcao,
  dominio,
  podeExcluir,
  aoSalvar,
  aoCriar,
  aoExcluir,
}: PropriedadesEditorFuncao) {
  const [expressao, setExpressao] = useState(funcao.expressao);
  const [nome, setNome] = useState(funcao.nome);
  const [descricao, setDescricao] = useState(funcao.descricao);
  const [cor, setCor] = useState(funcao.cor);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);
  const curvaDesenhada = funcao.id.startsWith("desenho-");

  useEffect(() => {
    setExpressao(funcao.expressao);
    setNome(funcao.nome);
    setDescricao(funcao.descricao);
    setCor(funcao.cor);
    setErro("");
  }, [funcao]);

  useEffect(() => setSalvo(false), [funcao.id]);

  function aplicar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const resultado = curvaDesenhada && expressao === funcao.expressao
      ? { calcular: funcao.calcular, erro: "" }
      : tentarCriarFuncao(expressao, dominio);
    if (!resultado.calcular) {
      setErro(resultado.erro);
      return;
    }
    const atualizado = {
      ...funcao,
      nome: nome.trim() || "Modelo personalizado",
      descricao,
      expressao,
      cor,
      calcular: resultado.calcular,
    };
    if (!aoSalvar(atualizado)) {
      setErro("O modelo não pôde ser aplicado no domínio atual. Consulte a mensagem no experimento.");
      return;
    }
    setErro("");
    setSalvo(true);
  }

  const ajuda = erro || (curvaDesenhada
    ? "Interpolação dos pontos capturados no gráfico."
    : "Use *, /, ^, sen(x), cos(x), exp(x). Decimais com ponto.");

  return (
    <form className="function-editor" onSubmit={aplicar}>
      <label className="field-label" htmlFor="expressao">Expressão da trajetória</label>
      <div className={`expression-field ${erro ? "has-error" : ""}`}>
        <span>f(x) =</span>
        <input
          id="expressao"
          value={expressao}
          spellCheck={false}
          onChange={(evento) => {
            setExpressao(evento.target.value);
            setErro("");
            setSalvo(false);
          }}
          aria-invalid={!!erro}
          aria-describedby="expression-help"
        />
      </div>
      <p id="expression-help" className={erro ? "field-error" : "field-hint"} role={erro ? "alert" : undefined}>
        {ajuda}
      </p>
      <Button variant="outlined" fullWidth type="submit" endIcon={<Icone nome="arrow" size={16} />}>
        Aplicar expressão
      </Button>
      {salvo && <span className="field-hint" role="status">Modelo aplicado.</span>}
      <details className="model-details">
        <summary>Detalhes do modelo</summary>
        <div className="details-fields">
          <TextField label="Nome do modelo" value={nome} onChange={(evento) => setNome(evento.target.value)} />
          <TextField
            label="Descrição"
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            multiline
            minRows={2}
          />
          <label className="color-field">
            Cor da curva
            <input aria-label="Cor da curva" type="color" value={cor} onChange={(evento) => setCor(evento.target.value)} />
          </label>
          <Button type="submit" variant="outlined">Salvar detalhes</Button>
        </div>
      </details>
      <div className="model-actions">
        <button type="button" onClick={aoCriar}><Icone nome="plus" size={14} /> Novo modelo</button>
        <button type="button" onClick={aoExcluir} disabled={!podeExcluir}>Excluir</button>
      </div>
    </form>
  );
}
