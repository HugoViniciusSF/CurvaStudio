import type { CSSProperties } from "react";

const caminhos = {
  play: "m9 5 11 7-11 7Z",
  pause: "M8 5v14M16 5v14",
  reset: "M3 10a9 9 0 1 1 2 8M3 4v6h6",
  step: "m5 5 10 7-10 7ZM19 5v14",
  download: "M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5",
  chart: "M4 4v16h17M7 15l4-5 4 3 5-7",
  book: "M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  grid: "M4 4h16v16H4ZM4 12h16M12 4v16",
  pen: "m15 4 5 5M4 20l1-6L16 3l5 5L10 19Z",
  info: "M12 11v6M12 7v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  close: "m6 6 12 12M6 18 18 6",
  settings: "M4 7h16M4 17h16M8 4v6M16 14v6",
  flask: "M9 3h6M10 3v7L4 20h16l-6-10V3M7 15h10",
} as const;

export function Icone({ nome, size = 18, style }: { nome: keyof typeof caminhos; size?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={caminhos[nome]} />
    </svg>
  );
}
