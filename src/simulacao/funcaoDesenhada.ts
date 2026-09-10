import type { ModeloCurva } from "../tipos/ModeloCurva";

export interface PontoDesenhado {
  x: number;
  y: number;
}

export function criarFuncaoDesenhada(
  pontos: PontoDesenhado[],
  id = `desenho-${Date.now()}`,
): ModeloCurva | null {
  const pontosNormalizados = normalizarPontos(pontos);

  if (pontosNormalizados.length < 4) {
    return null;
  }

  return {
    id,
    nome: "Trajetória desenhada",
    expressao: `interpolação linear (${pontosNormalizados.length} pontos)`,
    descricao: "Modelo criado a partir de uma trajetória desenhada manualmente.",
    cor: "#246f60",
    calcular: criarInterpolador(pontosNormalizados),
  };
}

function criarInterpolador(pontos: PontoDesenhado[]) {
  return (x: number) => {
    if (x <= pontos[0].x) {
      return pontos[0].y;
    }

    const ultimo = pontos[pontos.length - 1];

    if (x >= ultimo.x) {
      return ultimo.y;
    }

    for (let indice = 0; indice < pontos.length - 1; indice += 1) {
      const atual = pontos[indice];
      const proximo = pontos[indice + 1];

      if (x >= atual.x && x <= proximo.x) {
        const proporcao = (x - atual.x) / (proximo.x - atual.x || 1);
        return atual.y + (proximo.y - atual.y) * proporcao;
      }
    }

    return ultimo.y;
  };
}

function normalizarPontos(pontos: PontoDesenhado[]) {
  const pontosOrdenados = [...pontos]
    .filter((ponto) => Number.isFinite(ponto.x) && Number.isFinite(ponto.y))
    .sort((a, b) => a.x - b.x);
  const grupos = new Map<number, { x: number; somaY: number; total: number }>();

  for (const ponto of pontosOrdenados) {
    const chave = Number(ponto.x.toFixed(2));
    const grupo = grupos.get(chave);

    if (grupo) {
      grupo.somaY += ponto.y;
      grupo.total += 1;
    } else {
      grupos.set(chave, {
        x: ponto.x,
        somaY: ponto.y,
        total: 1,
      });
    }
  }

  return [...grupos.values()]
    .map((grupo) => ({
      x: grupo.x,
      y: grupo.somaY / grupo.total,
    }))
    .sort((a, b) => a.x - b.x);
}
