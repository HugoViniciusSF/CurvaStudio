type Calcular = (x: number) => number;

interface DefinicaoFuncao {
  calcular: (...argumentos: number[]) => number;
  minimo: number;
  maximo: number;
}

const unaria = (calcular: (valor: number) => number): DefinicaoFuncao => ({
  calcular,
  minimo: 1,
  maximo: 1,
});

const funcoesPermitidas: Record<string, DefinicaoFuncao> = {
  abs: unaria(Math.abs),
  acos: unaria(Math.acos),
  asin: unaria(Math.asin),
  atan: unaria(Math.atan),
  ceil: unaria(Math.ceil),
  cos: unaria(Math.cos),
  exp: unaria(Math.exp),
  floor: unaria(Math.floor),
  ln: unaria(Math.log),
  log: unaria(Math.log),
  log10: unaria(Math.log10),
  max: { calcular: Math.max, minimo: 1, maximo: Infinity },
  min: { calcular: Math.min, minimo: 1, maximo: Infinity },
  pow: { calcular: Math.pow, minimo: 2, maximo: 2 },
  round: unaria(Math.round),
  sen: unaria(Math.sin),
  sin: unaria(Math.sin),
  sqrt: unaria(Math.sqrt),
  tan: unaria(Math.tan),
};

const constantesPermitidas: Record<string, number> = {
  E: Math.E,
  PI: Math.PI,
  e: Math.E,
  pi: Math.PI,
};

interface Token {
  tipo: "numero" | "nome" | "operador" | "fim";
  texto: string;
}

/** Compila somente a gramática matemática; nenhuma expressão executa JavaScript. */
export function criarFuncaoPorExpressao(expressaoOriginal: string): Calcular {
  const expressao = normalizarExpressao(expressaoOriginal);

  if (!expressao) {
    throw new Error("Escreva uma expressão para definir a curva.");
  }

  if (expressao.length > 2000) {
    throw new Error("A expressão é muito longa. Use até 2.000 caracteres.");
  }

  const calcular = new Parser(tokenizar(expressao)).analisar();

  return (x: number) => {
    if (!Number.isFinite(x)) {
      throw new Error("A coordenada x precisa ser um número finito.");
    }

    try {
      return exigirFinito(calcular(x));
    } catch {
      throw new Error(
        "A função não está definida em x = " + formatarX(x) + ". Verifique divisões por zero, raízes e logaritmos.",
      );
    }
  };
}

/** Sem domínio, valida a sintaxe. Com domínio, também verifica as amostras da curva. */
export function tentarCriarFuncao(
  expressao: string,
  dominio?: { minimo: number; maximo: number },
  quantidadeAmostras = 501,
) {
  try {
    const calcular = criarFuncaoPorExpressao(expressao);

    if (dominio) {
      validarNoDominio(calcular, dominio.minimo, dominio.maximo, quantidadeAmostras);
    }

    return { calcular, erro: "" };
  } catch (erro) {
    return {
      calcular: null,
      erro: erro instanceof Error ? erro.message : "Expressão inválida.",
    };
  }
}

/** A verificação por amostragem não constitui uma prova de continuidade. */
export function validarNoDominio(
  calcular: Calcular,
  minimo: number,
  maximo: number,
  quantidadeAmostras = 501,
) {
  if (!Number.isFinite(minimo) || !Number.isFinite(maximo) || minimo >= maximo
    || !Number.isFinite(maximo - minimo)) {
    throw new Error("O domínio deve ter limites finitos, com mínimo menor que máximo.");
  }

  if (!Number.isInteger(quantidadeAmostras) || quantidadeAmostras < 2) {
    throw new Error("A curva precisa de pelo menos duas amostras.");
  }

  const passo = (maximo - minimo) / (quantidadeAmostras - 1);

  for (let indice = 0; indice < quantidadeAmostras; indice += 1) {
    const x = indice === quantidadeAmostras - 1 ? maximo : minimo + passo * indice;

    try {
      exigirFinito(calcular(x));
    } catch (erro) {
      if (erro instanceof Error && erro.message.includes("x =")) throw erro;
      throw new Error("A função não produz um valor real e finito em x = " + formatarX(x) + ".");
    }
  }
}

class Parser {
  private indice = 0;

  constructor(private readonly tokens: Token[]) {}

  analisar(): Calcular {
    const calcular = this.soma();

    if (this.atual().tipo !== "fim") {
      throw new Error("Símbolo inesperado: " + this.atual().texto + ". Use * para multiplicar e ponto nos decimais dentro de funções.");
    }

    return calcular;
  }

  private atual() {
    return this.tokens[this.indice];
  }

  private aceitar(texto: string) {
    if (this.atual().texto !== texto) return false;
    this.indice += 1;
    return true;
  }

  private exigir(texto: string) {
    if (!this.aceitar(texto)) {
      throw new Error("Esperado “" + texto + "” antes de “" + (this.atual().texto || "fim da expressão") + "”.");
    }
  }

  private soma(): Calcular {
    let resultado = this.produto();

    while (["+", "-"].includes(this.atual().texto)) {
      const operador = this.tokens[this.indice++].texto;
      const esquerda = resultado;
      const direita = this.produto();
      resultado = (x) => exigirFinito(operador === "+" ? esquerda(x) + direita(x) : esquerda(x) - direita(x));
    }

    return resultado;
  }

  private produto(): Calcular {
    let resultado = this.unario();

    while (["*", "/"].includes(this.atual().texto)) {
      const operador = this.tokens[this.indice++].texto;
      const esquerda = resultado;
      const direita = this.unario();
      resultado = (x) => exigirFinito(operador === "*" ? esquerda(x) * direita(x) : esquerda(x) / direita(x));
    }

    return resultado;
  }

  private unario(): Calcular {
    if (this.aceitar("+")) return this.unario();
    if (this.aceitar("-")) {
      const valor = this.unario();
      return (x) => -valor(x);
    }

    return this.potencia();
  }

  private potencia(): Calcular {
    const base = this.primaria();

    // O expoente inclui o unário e outra potência: -2^2 = -4; 2^-2 = 0.25; 2^3^2 = 512.
    if (this.aceitar("^")) {
      const expoente = this.unario();
      return (x) => exigirFinito(Math.pow(base(x), expoente(x)));
    }

    return base;
  }

  private primaria(): Calcular {
    const token = this.atual();

    if (this.aceitar("(")) {
      const calcular = this.soma();
      this.exigir(")");
      return calcular;
    }

    if (token.tipo === "numero") {
      this.indice += 1;
      const valor = Number(token.texto.replace(",", "."));
      if (!Number.isFinite(valor)) throw new Error("Use números finitos na expressão.");
      return () => valor;
    }

    if (token.tipo === "nome") {
      this.indice += 1;
      if (token.texto === "x") return (x) => x;
      if (Object.hasOwn(constantesPermitidas, token.texto)) return () => constantesPermitidas[token.texto];
      if (!Object.hasOwn(funcoesPermitidas, token.texto)) throw new Error("Nome não permitido: " + token.texto + ".");

      const funcao = funcoesPermitidas[token.texto];
      this.exigir("(");
      const argumentos: Calcular[] = [];

      if (!this.aceitar(")")) {
        do {
          argumentos.push(this.soma());
        } while (this.aceitar(","));
        this.exigir(")");
      }

      if (argumentos.length < funcao.minimo || argumentos.length > funcao.maximo) {
        const quantidade = funcao.minimo === funcao.maximo ? String(funcao.minimo) : "pelo menos " + funcao.minimo;
        throw new Error(token.texto + " exige " + quantidade + " argumento(s). Separe argumentos por vírgula e use ponto nos decimais.");
      }

      return (x) => exigirFinito(funcao.calcular(...argumentos.map((argumento) => argumento(x))));
    }

    throw new Error("Esperado um número, x ou função antes de “" + (token.texto || "fim da expressão") + "”.");
  }
}

function tokenizar(expressao: string): Token[] {
  const tokens: Token[] = [];
  const parenteses: boolean[] = [];
  let indice = 0;

  while (indice < expressao.length) {
    const caractere = expressao[indice];
    if (/\s/.test(caractere)) { indice += 1; continue; }

    const restante = expressao.slice(indice);
    // Fora de chamadas, preserva a escrita decimal brasileira: 0,5 * x.
    // Em chamadas, toda vírgula separa argumentos: pow(2,3), min(1,2,3).
    const numero = restante.match(parenteses.includes(true)
      ? /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
      : /^(?:\d+(?:\.\d*|,\d+)?|\.\d+)(?:[eE][+-]?\d+)?/);
    const nome = restante.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);

    if (numero) {
      tokens.push({ tipo: "numero", texto: numero[0] });
      indice += numero[0].length;
    } else if (nome) {
      tokens.push({ tipo: "nome", texto: nome[0] });
      indice += nome[0].length;
    } else if ("+-*/^(),".includes(caractere)) {
      if (caractere === "(") parenteses.push(tokens.at(-1)?.tipo === "nome");
      if (caractere === ")") parenteses.pop();
      tokens.push({ tipo: "operador", texto: caractere });
      indice += 1;
    } else {
      throw new Error("Símbolo não permitido: " + caractere + ". Use números, x, operadores e funções matemáticas.");
    }

    if (tokens.length > 512) throw new Error("A expressão é muito complexa. Reduza a quantidade de termos.");
  }

  return [...tokens, { tipo: "fim", texto: "" }];
}

function normalizarExpressao(expressao: string) {
  return expressao
    .replace(/^\s*f\s*\(\s*x\s*\)\s*=/i, "")
    .replace(/[⁺⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (expoente) => "^(" + [...expoente].map((digito) => sobrescritos[digito]).join("") + ")")
    .replace(/\*\*|ˆ/g, "^")
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .trim();
}

function exigirFinito(valor: number) {
  if (!Number.isFinite(valor)) throw new Error("Resultado não real ou não finito.");
  return valor;
}

function formatarX(x: number) {
  return Number(x.toPrecision(8)).toLocaleString("pt-BR", { maximumSignificantDigits: 8 });
}

const sobrescritos: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-",
};
