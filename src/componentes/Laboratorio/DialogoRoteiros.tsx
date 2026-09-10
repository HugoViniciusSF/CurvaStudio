import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { Icone } from "../Icone";
import { roteiros, type RoteiroEstudo } from "./roteiros";

interface PropriedadesDialogoRoteiros {
  aberto: boolean;
  aoFechar: () => void;
  aoCarregar: (roteiro: RoteiroEstudo) => void;
}

export function DialogoRoteiros({ aberto, aoFechar, aoCarregar }: PropriedadesDialogoRoteiros) {
  return (
    <Dialog open={aberto} onClose={aoFechar} maxWidth="md" fullWidth aria-labelledby="dialog-title">
      <DialogTitle id="dialog-title">Roteiros de estudo</DialogTitle>
      <DialogContent>
        <p className="dialog-intro">
          Parta de uma pergunta. Altere uma variável por vez e compare os resultados.
        </p>
        <div className="study-cards">
          {roteiros.map((roteiro) => (
            <article key={roteiro.id}>
              <span className="study-number">{roteiro.numero}</span>
              <p className="eyebrow">{roteiro.tema}</p>
              <h3>{roteiro.titulo}</h3>
              <p>{roteiro.texto}</p>
              <Button
                variant="outlined"
                fullWidth
                endIcon={<Icone nome="arrow" size={15} />}
                onClick={() => aoCarregar(roteiro)}
              >
                Carregar roteiro
              </Button>
            </article>
          ))}
        </div>
        <p className="field-hint">
          Carregar um roteiro prepara um novo ensaio. Exporte os dados atuais para conservá-los.
        </p>
      </DialogContent>
      <DialogActions>
        <Button onClick={aoFechar}>Voltar ao laboratório</Button>
      </DialogActions>
    </Dialog>
  );
}
