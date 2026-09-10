import type { GrandezasFisicas } from "../../tipos/EstadoSimulacao";
import { formatarNumero } from "../../utilidades/formatacaoNumerica";

interface PropriedadesMetrica {
  titulo: string;
  simbolo: string;
  valor: number;
  unidade: string;
  descricao: string;
  cor?: string;
}

export function PainelGrandezas({ metricas }: { metricas: GrandezasFisicas }) {
  return (
    <section className="metrics-strip" aria-label="Grandezas instantâneas">
      <Metrica
        titulo="Velocidade"
        simbolo="v"
        valor={metricas.velocidade}
        unidade="m/s"
        descricao="Ao longo da curva · sinal indica o sentido"
      />
      <Metrica
        titulo="Altura"
        simbolo="y"
        valor={metricas.altura}
        unidade="m"
        descricao="Em relação a y = 0"
      />
      <Metrica
        titulo="Energia cinética"
        simbolo="Ec"
        valor={metricas.energiaCinetica}
        unidade="J"
        descricao="½ mv²"
        cor="#b58843"
      />
      <Metrica
        titulo="Energia potencial"
        simbolo="Ep"
        valor={metricas.energiaPotencial}
        unidade="J"
        descricao="mgy"
        cor="#6688a8"
      />
      <Metrica
        titulo="Energia mecânica"
        simbolo="Em"
        valor={metricas.energiaTotal}
        unidade="J"
        descricao="Ec + Ep"
        cor="#246f60"
      />
    </section>
  );
}

function Metrica({ titulo, simbolo, valor, unidade, descricao, cor }: PropriedadesMetrica) {
  return (
    <article className="metric">
      <div>
        <span>{titulo}</span>
        <i style={{ color: cor }}>{simbolo}</i>
      </div>
      <strong>{formatarNumero(valor)}<small>{unidade}</small></strong>
      <p>
        {cor && <span className="metric-dot" style={{ background: cor }} />}
        {descricao}
      </p>
    </article>
  );
}
