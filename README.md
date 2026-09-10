# Curva · Laboratório de dinâmica

Simulador interativo de mecânica clássica para estudar o movimento de uma partícula ao longo de uma trajetória matemática. Permite investigar como a forma da curva, a gravidade, a velocidade inicial e o atrito influenciam o movimento e a transformação de energia.

A aplicação tem interface em português e executa os cálculos no navegador, sem backend ou banco de dados.

## Funcionalidades

- Cinco modelos de curva: senoidal, quadrática convexa, quadrática côncava, cúbica assimétrica e cosseno com tendência.
- Criação de trajetórias por expressão matemática ou desenho direto no gráfico.
- Ajuste do domínio, da massa, da gravidade, do coeficiente de atrito e da velocidade inicial, de 0 a 1.000 m/s.
- Referências de gravidade para Terra, Lua e Marte.
- Controles de início, pausa, continuação, reinício, avanço manual e ritmo de reprodução entre 0,25× e 30×.
- Visualização da trajetória com grade, tangente, vetor velocidade e cor da partícula personalizável.
- Indicadores de velocidade, altura e energias cinética, potencial e mecânica.
- Gráficos temporais de energia e velocidade, tabela de amostras e exportação em CSV.
- Roteiros de estudo sobre conservação de energia, dissipação e gravidade.

## Executar localmente

Requisitos: **Node.js 22.12 ou superior**, npm e um navegador atualizado.

Na pasta do projeto, instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm ci
npm run dev
```

Acesse [http://127.0.0.1:5173](http://127.0.0.1:5173). Se a porta estiver ocupada, use o endereço indicado no terminal.

## Usar o laboratório

1. Escolha um modelo matemático ou abra **Roteiros de estudo** para carregar um experimento.
2. Ajuste a expressão, o domínio e os parâmetros físicos. Use **Aplicar expressão** para confirmar a edição da curva.
3. Clique em **Iniciar experimento**. Acompanhe a trajetória e as grandezas instantâneas; pause ou avance um passo para examinar o movimento.
4. Em **Evolução temporal**, alterne entre **Energia**, **Velocidade** e **Dados**. Escolha o intervalo entre as amostras para ajustar a série exibida.
5. Use **Exportar dados** para salvar os registros em CSV.

Para mudar a cor da partícula, clique no círculo colorido ao lado de **Partícula**, na legenda do gráfico. O ritmo de reprodução altera a passagem do tempo simulado; não altera a velocidade física configurada.

Alterar o modelo ou os parâmetros físicos reinicia o experimento. Modelos personalizados e registros são mantidos apenas na sessão atual: exporte os dados antes de reiniciar ou recarregar a página.

## Expressões matemáticas

Use `x` como variável e escreva as multiplicações explicitamente:

| Expressão | Trajetória |
| --- | --- |
| `0.18 * x^2 - 2.4` | Vale parabólico |
| `1.2 * sen(1.25 * x)` | Curva senoidal |
| `0.85 * cos(1.4 * x) + 0.12 * x` | Oscilação com tendência linear |
| `exp(-x^2)` | Perfil gaussiano |
| `sqrt(x)` | Raiz quadrada, em domínio não negativo |

São aceitos operadores como `+`, `-`, `*`, `/`, `^` e `**`, constantes como `pi` e `e` e funções como `sen`, `sin`, `cos`, `tan`, `sqrt`, `abs`, `exp`, `ln`, `log`, `min`, `max` e `pow`. Use ponto nos decimais; vírgulas separam argumentos, como em `pow(x, 2)`.

O desenho manual usa interpolação linear, com uma altura para cada posição `x`. Fora da região desenhada, conserva as alturas das extremidades.

## Amostras e exportação

Cada amostra registra o tempo simulado, a posição, a velocidade, a altura e as energias. O intervalo pode ser definido como **0,025; 0,05; 0,1; 0,25; 0,5; 1 ou 2 segundos**. O padrão é 0,05 s.

Mudar o intervalo atualiza os gráficos, a tabela e o CSV usando os estados já calculados, inclusive com o experimento pausado ou encerrado. As condições inicial e final e os avanços manuais também entram na série; por isso, reduzir o intervalo pela metade não garante exatamente o dobro no total de amostras.

A tabela mostra as últimas oito amostras. O CSV contém toda a série selecionada, com as colunas:

```text
tempo_s,x_m,velocidade_m_s,altura_m,energia_cinetica_J,energia_potencial_J,energia_total_J
```

O arquivo usa vírgula como separador de colunas e ponto como separador decimal. Ele contém os dados da simulação, mas não salva a expressão nem os parâmetros necessários para reabrir um experimento completo.

## Modelo físico

A partícula permanece confinada à curva `y = f(x)`. A velocidade é tangencial: positiva no sentido de `x` crescente e negativa no retorno. A altura é medida em relação a `y = 0`.

- Energia cinética: `Ec = ½mv²`.
- Energia potencial gravitacional: `Ep = mgy`.
- Energia mecânica: `Em = Ec + Ep`.

A integração usa Runge–Kutta de quarta ordem com refinamento interno. O experimento encerra ao atingir uma fronteira do domínio ou o repouso.

O modelo adota atrito com força normal aproximada e não inclui rolamento, desprendimento ou resistência do ar. Curvas suaves são mais adequadas; quinas, descontinuidades e singularidades exigem cuidado na interpretação. Consulte as [equações, hipóteses e limites do modelo](docs/MODELO_FISICO.md).

## Desenvolvimento

O projeto utiliza **React, TypeScript, Vite, Material UI e SVG**.

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Iniciar o servidor de desenvolvimento |
| `npm run check` | Verificar tipos e símbolos não utilizados |
| `npm test` | Executar os testes de expressões, física e controle da simulação |
| `npm run build` | Verificar o TypeScript e gerar a aplicação em `dist/` |
| `npm run preview` | Servir localmente a versão compilada, após o build |

Os testes incluem soluções analíticas, conservação de energia, dissipação, velocidades de até 1.000 m/s, pausa, amostragem e exportação.

```text
src/
├── Aplicacao/     # Tema e estilos gerais
├── componentes/   # Interface, controles, editores e gráficos
├── ganchos/       # Ciclo de execução da simulação
├── simulacao/     # Física, expressões, trajetórias e histórico
├── tipos/         # Contratos compartilhados
└── utilidades/    # Formatação numérica
scripts/          # Testes automatizados
docs/             # Documentação do modelo físico
```

Os modelos predefinidos estão em `src/simulacao/modelosPadrao.ts`, as condições iniciais em `src/simulacao/configuracaoPadrao.ts` e os roteiros em `src/componentes/Laboratorio/roteiros.ts`.
