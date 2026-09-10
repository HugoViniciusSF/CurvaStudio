import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { Laboratorio } from "../componentes/Laboratorio/Laboratorio";
import "./laboratorio.css";

const tema = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#246f60" },
    text: { primary: "#253b34", secondary: "#65766f" },
    background: { default: "#f4f6f5", paper: "#ffffff" },
  },
  shape: { borderRadius: 7 },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 38 } } },
    MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
    MuiOutlinedInput: { styleOverrides: { root: { fontSize: "0.875rem", background: "#fff" } } },
    MuiDialog: { styleOverrides: { paper: { padding: 8 } } },
  },
});
export default function Aplicacao() {
  return (
    <ThemeProvider theme={tema}>
      <CssBaseline />
      <Laboratorio />
    </ThemeProvider>
  );
}
