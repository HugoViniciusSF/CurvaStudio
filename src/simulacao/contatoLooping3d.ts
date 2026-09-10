import type { Ponto3D } from './looping3d';

export interface GeometriaContato3D {
  tangentes: Ponto3D[];
  normais: Ponto3D[];
  curvaturas: Ponto3D[];
}

export const somar = (a: Ponto3D, b: Ponto3D): Ponto3D => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const escalar = (a: Ponto3D, valor: number): Ponto3D => ({ x: a.x * valor, y: a.y * valor, z: a.z * valor });
const subtrair = (a: Ponto3D, b: Ponto3D) => somar(a, escalar(b, -1));
const produto = (a: Ponto3D, b: Ponto3D) => a.x * b.x + a.y * b.y + a.z * b.z;
const norma = (a: Ponto3D) => Math.hypot(a.x, a.y, a.z);
const normalizar = (a: Ponto3D) => escalar(a, 1 / norma(a));
const cruzar = (a: Ponto3D, b: Ponto3D): Ponto3D => ({
  x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x,
});
const interpolar = (a: Ponto3D, b: Ponto3D, t: number) => somar(escalar(a, 1 - t), escalar(b, t));

/** A face de sustentação começa voltada para cima e acompanha a curva sem torção adicional. */
export function prepararGeometriaContato(pontos: Ponto3D[], acumulados: number[]): GeometriaContato3D {
  const direcoes = pontos.slice(1).map((ponto, i) => normalizar(subtrair(ponto, pontos[i])));
  const tangentes = pontos.map((_, i) => {
    if (i === 0) return direcoes[0];
    if (i === pontos.length - 1) return direcoes[i - 1];
    const media = somar(direcoes[i - 1], direcoes[i]);
    return norma(media) > 1e-10 ? normalizar(media) : direcoes[i];
  });
  const curvaturas = pontos.map((_, i): Ponto3D => {
    if (i === 0 || i === pontos.length - 1) return { x: 0, y: 0, z: 0 };
    // Em um círculo com cordas iguais, |ΔT| / média(Δs) = 1/R exatamente.
    return escalar(subtrair(direcoes[i], direcoes[i - 1]), 2 / (acumulados[i + 1] - acumulados[i - 1]));
  });
  const vertical = { x: 0, y: 1, z: 0 };
  const apoio = Math.abs(tangentes[0].y) > 0.999999 ? { x: 1, y: 0, z: 0 } : vertical;
  const normais = [normalizar(subtrair(apoio, escalar(tangentes[0], produto(apoio, tangentes[0]))))];
  for (let i = 1; i < tangentes.length; i++) {
    const eixo = cruzar(tangentes[i - 1], tangentes[i]);
    const seno = norma(eixo);
    const cosseno = Math.max(-1, Math.min(1, produto(tangentes[i - 1], tangentes[i])));
    let normal = normais[i - 1];
    if (seno > 1e-12) {
      const eixoUnitario = escalar(eixo, 1 / seno);
      normal = somar(somar(escalar(normal, cosseno), escalar(cruzar(eixoUnitario, normal), seno)),
        escalar(eixoUnitario, produto(eixoUnitario, normal) * (1 - cosseno)));
    }
    // Remove apenas o erro de arredondamento acumulado pelo transporte.
    normais.push(normalizar(subtrair(normal, escalar(tangentes[i], produto(normal, tangentes[i])))));
  }
  return { tangentes, normais, curvaturas };
}

export function contatoNoSegmento(geometria: GeometriaContato3D, indice: number, fracao: number, v2: number, g: number) {
  const normal = interpolar(geometria.normais[indice], geometria.normais[indice + 1], fracao);
  const curvatura = interpolar(geometria.curvaturas[indice], geometria.curvaturas[indice + 1], fracao);
  const direcao = interpolar(geometria.tangentes[indice], geometria.tangentes[indice + 1], fracao);
  const tangente = norma(direcao) > 1e-10 ? normalizar(direcao) : geometria.tangentes[indice + 1];
  const comprimentoNormal = norma(normal);
  // Em uma reversão abrupta, a polilinha não define curvatura suave. A face
  // escolhida no vértice evita divisão por zero; refinar o desenho melhora a aproximação.
  const normalUnitaria = comprimentoNormal > 1e-10 ? escalar(normal, 1 / comprimentoNormal) : geometria.normais[indice + 1];
  return { tangente, normal: normalUnitaria, aceleracaoNormal: v2 * produto(curvatura, normalUnitaria) + g * normalUnitaria.y };
}

/**
 * O sinal de N é o de um polinômio cúbico: v² é linear em s e κ e n são
 * interpolados linearmente. Particionar nos pontos críticos encontra também
 * uma região negativa inteiramente contida no passo, sem amostragem temporal.
 */
export function primeiraPerdaDeContato(
  geometria: GeometriaContato3D, indice: number, de: number, ate: number,
  v2NoInicio: number, variacaoV2: number, g: number,
): number | null {
  const n = geometria.normais[indice];
  const dn = subtrair(geometria.normais[indice + 1], n);
  const k = geometria.curvaturas[indice];
  const dk = subtrair(geometria.curvaturas[indice + 1], k);
  const c0 = produto(k, n);
  const c1 = produto(k, dn) + produto(dk, n);
  const c2 = produto(dk, dn);
  const coef = [v2NoInicio * c0 + g * n.y,
    v2NoInicio * c1 + variacaoV2 * c0 + g * dn.y,
    v2NoInicio * c2 + variacaoV2 * c1, variacaoV2 * c2];
  const valor = (u: number) => ((coef[3] * u + coef[2]) * u + coef[1]) * u + coef[0];
  const tolerancia = 1e-9 * Math.max(1, g, ...coef.map(Math.abs));
  const criticos: number[] = [];
  const a = 3 * coef[3];
  const b = 2 * coef[2];
  const c = coef[1];
  if (Math.abs(a) <= Number.EPSILON * Math.max(1, Math.abs(b), Math.abs(c))) {
    if (b !== 0) criticos.push(-c / b);
  } else {
    const discriminante = b * b - 4 * a * c;
    if (discriminante >= 0) {
      const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(discriminante));
      criticos.push(q / a);
      if (q !== 0) criticos.push(c / q);
    }
  }
  const sentido = Math.sign(ate - de) || 1;
  const limites = [de, ...criticos.filter(u => u > Math.min(de, ate) && u < Math.max(de, ate)), ate]
    .sort((u, v) => sentido * (u - v));
  if (valor(de) < -tolerancia) return de;
  for (let i = 1; i < limites.length; i++) {
    if (valor(limites[i]) >= -tolerancia) continue;
    let baixo = limites[i - 1];
    let alto = limites[i];
    if (valor(baixo) <= 0) return baixo;
    for (let iteracao = 0; iteracao < 48; iteracao++) {
      const meio = (baixo + alto) / 2;
      if (valor(meio) < 0) alto = meio;
      else baixo = meio;
    }
    return (baixo + alto) / 2;
  }
  return null;
}
