import type { AmostraSimulacao, GrandezasFisicas } from "../tipos/EstadoSimulacao";

interface RegistroCalculado {
  passo: number;
  amostra: AmostraSimulacao;
  extra: boolean;
}

/** Conserva os estados físicos e seleciona a série exibida sem repetir a integração. */
export class HistoricoSimulacao {
  private registros: RegistroCalculado[] = [];
  private selecionadas: AmostraSimulacao[] = [];
  private publicadas: AmostraSimulacao[] = [];
  private passosPorAmostra: number;

  constructor(passosPorAmostra: number) {
    this.passosPorAmostra = passosPorAmostra;
  }

  reiniciar() {
    this.registros = [];
    this.selecionadas = [];
    this.publicadas = [];
  }

  registrar(passo: number, tempo: number, x: number, metricas: GrandezasFisicas, extra = false) {
    const ultimo = this.registros.at(-1);
    // Sem intervenções no estado físico, tempo, posição e velocidade identificam
    // o mesmo registro. Isso também evita duplicar o repouso no instante inicial.
    if (ultimo && ultimo.amostra.tempo === tempo && ultimo.amostra.x === x
      && ultimo.amostra.velocidade === metricas.velocidade) {
      if (extra) {
        ultimo.extra = true;
        if (this.selecionadas.at(-1) !== ultimo.amostra) this.selecionadas.push(ultimo.amostra);
      }
      return;
    }
    const amostra: AmostraSimulacao = { tempo, x, ...metricas };
    this.registros.push({ passo, amostra, extra });
    if (extra || passo % this.passosPorAmostra === 0) this.selecionadas.push(amostra);
  }

  selecionarIntervalo(passosPorAmostra: number) {
    if (this.passosPorAmostra === passosPorAmostra) return;
    this.passosPorAmostra = passosPorAmostra;
    this.selecionadas = this.registros
      .filter((registro) => registro.extra || registro.passo % passosPorAmostra === 0)
      .map((registro) => registro.amostra);
    // A seleção pode mudar os instantes sem mudar a quantidade de amostras.
    this.publicadas = [...this.selecionadas];
  }

  obterAmostras() {
    // Os snapshots entregues ao React não são alterados pelos passos seguintes.
    // Reutilizar o último evita copiar o histórico e atualizar gráficos entre amostras.
    if (this.publicadas.length !== this.selecionadas.length) {
      this.publicadas = [...this.selecionadas];
    }
    return this.publicadas;
  }

  exportarCSV() {
    const cabecalho = "tempo_s,x_m,velocidade_m_s,altura_m,energia_cinetica_J,energia_potencial_J,energia_total_J";
    const linhas = this.selecionadas.map((amostra) => [
      amostra.tempo, amostra.x, amostra.velocidade, amostra.altura,
      amostra.energiaCinetica, amostra.energiaPotencial, amostra.energiaTotal,
    ].map((valor) => Number(valor.toPrecision(12)).toString()).join(","));
    return `${cabecalho}\n${linhas.join("\n")}\n`;
  }
}
