import { useEffect, useId, useState } from "react";
import { Slider } from "@mui/material";
import type { ConfiguracaoSimulacao } from "../../tipos/ConfiguracaoSimulacao";

const LIMITES_PARAMETROS = {
  gravidade: { min: 0, max: 100, step: 0.01 },
  massa: { min: 0.01, max: 1000, step: 0.1 },
  velocidadeInicial: { min: 0, max: 1000, step: 0.1 },
  coeficienteAtrito: { min: 0, max: 1, step: 0.005 },
} as const;

const REFERENCIAS_GRAVIDADE = [
  { nome: "Terra", gravidade: 9.81 },
  { nome: "Lua", gravidade: 1.62 },
  { nome: "Marte", gravidade: 3.71 },
] as const;

type ParametroFisico = keyof typeof LIMITES_PARAMETROS;

interface PropriedadesEditorConfiguracao {
  configuracao: ConfiguracaoSimulacao;
  aoAlterar: (configuracao: ConfiguracaoSimulacao) => boolean;
}

interface PropriedadesCampoNumero {
  label: string;
  simbolo?: string;
  unidade: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (valor: number) => boolean | void;
}

export function EditorConfiguracao({ configuracao, aoAlterar }: PropriedadesEditorConfiguracao) {
  function alterarParametro(campo: ParametroFisico, valor: number) {
    return aoAlterar({ ...configuracao, [campo]: valor });
  }

  return (
    <div className="physical-fields">
      <div className="gravity-presets" aria-label="Referência de gravidade">
        {REFERENCIAS_GRAVIDADE.map(({ nome, gravidade }) => (
          <button
            key={nome}
            type="button"
            aria-pressed={configuracao.gravidade === gravidade}
            onClick={() => alterarParametro("gravidade", gravidade)}
          >
            {nome}
          </button>
        ))}
      </div>

      <div className="two-fields">
        <CampoNumero
          label="Gravidade"
          simbolo="g"
          unidade="m/s²"
          value={configuracao.gravidade}
          {...LIMITES_PARAMETROS.gravidade}
          onChange={(valor) => alterarParametro("gravidade", valor)}
        />
        <CampoNumero
          label="Massa"
          simbolo="m"
          unidade="kg"
          value={configuracao.massa}
          {...LIMITES_PARAMETROS.massa}
          onChange={(valor) => alterarParametro("massa", valor)}
        />
      </div>

      <CampoNumero
        label="Velocidade inicial"
        simbolo="v₀"
        unidade="m/s"
        value={configuracao.velocidadeInicial}
        {...LIMITES_PARAMETROS.velocidadeInicial}
        onChange={(valor) => alterarParametro("velocidadeInicial", valor)}
      />
      <Slider
        aria-label="Ajustar velocidade inicial"
        value={Math.min(configuracao.velocidadeInicial, LIMITES_PARAMETROS.velocidadeInicial.max)}
        {...LIMITES_PARAMETROS.velocidadeInicial}
        onChange={(_, valor) => {
          if (typeof valor === "number") alterarParametro("velocidadeInicial", valor);
        }}
        size="small"
      />

      <CampoNumero
        label="Coeficiente de atrito"
        simbolo="μ"
        unidade=""
        value={configuracao.coeficienteAtrito}
        {...LIMITES_PARAMETROS.coeficienteAtrito}
        onChange={(valor) => alterarParametro("coeficienteAtrito", valor)}
      />
      <Slider
        aria-label="Ajustar coeficiente de atrito"
        value={configuracao.coeficienteAtrito}
        {...LIMITES_PARAMETROS.coeficienteAtrito}
        onChange={(_, valor) => {
          if (typeof valor === "number") alterarParametro("coeficienteAtrito", valor);
        }}
        size="small"
      />
      <div className="slider-labels">
        <span>Sem atrito</span>
        <span>μ = 1</span>
      </div>
      <p className="settings-note">Alterar o modelo ou os parâmetros reinicia o experimento.</p>
    </div>
  );
}

export function CampoNumero({
  label,
  simbolo,
  unidade,
  value,
  min,
  max,
  step,
  onChange,
}: PropriedadesCampoNumero) {
  const id = useId();
  const [valorDigitado, definirValorDigitado] = useState(String(value));

  useEffect(() => definirValorDigitado(String(value)), [value]);

  function confirmarValor() {
    const valorNumerico = Number(valorDigitado.replace(",", "."));
    const valorInvalido = valorDigitado.trim() === ""
      || !Number.isFinite(valorNumerico)
      || valorNumerico < min
      || valorNumerico > max;

    if (valorInvalido || valorNumerico === value) {
      definirValorDigitado(String(value));
      return;
    }
    if (onChange(valorNumerico) === false) definirValorDigitado(String(value));
  }

  return (
    <div className="number-field">
      <label htmlFor={id}>
        {label}
        {simbolo && <i>{simbolo}</i>}
      </label>
      <div>
        <input
          id={id}
          type="number"
          value={valorDigitado}
          min={min}
          max={max}
          step={step}
          onChange={(evento) => definirValorDigitado(evento.target.value)}
          onBlur={confirmarValor}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") evento.currentTarget.blur();
          }}
        />
        <span>{unidade}</span>
      </div>
    </div>
  );
}
