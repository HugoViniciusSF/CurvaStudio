const formatos = new Map<string, Intl.NumberFormat>();

function numeroLocalizado(valor: number, opcoes: Intl.NumberFormatOptions) {
  const chave = JSON.stringify(opcoes);
  let formato = formatos.get(chave);
  if (!formato) {
    formato = new Intl.NumberFormat("pt-BR", opcoes);
    formatos.set(chave, formato);
  }
  return formato.format(valor);
}

/** Valores apresentados nos indicadores, controles e tabela de amostras. */
export function formatarNumero(valor: number, casas = 2) {
  return numeroLocalizado(valor, {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** Coordenadas sem agrupamento, com precisão opcional para a posição atual. */
export function formatarCoordenada(valor: number, casas?: number) {
  return numeroLocalizado(Math.abs(valor) < 1e-8 ? 0 : valor, {
    minimumFractionDigits: casas ?? 0,
    maximumFractionDigits: casas ?? 5,
    useGrouping: false,
  });
}

/** Rótulos compactos para eixos com escalas muito grandes ou muito pequenas. */
export function formatarNumeroEixo(valor: number) {
  const numero = Math.abs(valor) < 1e-12 ? 0 : valor;
  if (numero !== 0 && (Math.abs(numero) >= 10000 || Math.abs(numero) < 0.001)) {
    return numero.toExponential(1).replace(".", ",").replace("e+", "e");
  }
  return numeroLocalizado(numero, {
    maximumSignificantDigits: 4,
    useGrouping: false,
  });
}
