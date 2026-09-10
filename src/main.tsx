import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Aplicacao from "./Aplicacao/Aplicacao";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Aplicacao />
  </StrictMode>,
);
