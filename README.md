# CURVA Studio

Simulador interativo de mecânica clássica para estudar o movimento de uma partícula ao longo de uma trajetória matemática. Permite investigar como a forma da curva, a gravidade, a velocidade inicial e o atrito influenciam o movimento e a transformação de energia.

A aplicação tem interface em português e executa os cálculos no navegador, sem backend ou banco de dados.

Há duas guias independentes: **Laboratório**, para trajetórias `y = f(x)` com atrito opcional, e **Looping 3D**, para estudar conservação de energia em trajetórias espaciais `(x, y, z)`. Ao alternar entre elas, a reprodução é pausada e as condições e os registros de cada ensaio são preservados na sessão.

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
- Guia **Looping 3D** com rampa, looping e saída, desenho livre, edição de coordenadas, câmera rotacionável e exportação das três coordenadas.

## Executar localmente

Requisitos: **Node.js 22.12 ou superior**, npm e um navegador atualizado.

Na pasta do projeto, instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm ci
npm run dev
```

Acesse [http://127.0.0.1:5173](http://127.0.0.1:5173). Se a porta estiver ocupada, use o endereço indicado no terminal.

## Usar o laboratório

Os controles e valores desta seção até **Variáveis e modelo físico** correspondem à guia **Laboratório**. A guia espacial é descrita em [Looping 3D](#looping-3d--conservação-de-energia).

1. Escolha um modelo matemático ou abra **Roteiros de estudo** para carregar um experimento.
2. Ajuste a expressão, o domínio e os parâmetros físicos. Use **Aplicar expressão** para confirmar a edição da curva. Nos campos numéricos, confirme com **Enter** ou ao sair do campo.
3. Clique em **Iniciar experimento**. Acompanhe a trajetória e as grandezas instantâneas; pause ou avance um passo para examinar o movimento.
4. Em **Evolução temporal**, alterne entre **Energia**, **Velocidade** e **Dados**. Escolha o intervalo entre as amostras para ajustar a série exibida.
5. Use **Exportar dados** para salvar os registros em CSV.

Para mudar a cor da partícula, clique no círculo colorido ao lado de **Partícula**, na legenda do gráfico. Em **Detalhes do modelo**, é possível editar o nome, a descrição e a cor da curva; confirme em **Salvar detalhes**.

Reiniciar, aplicar ou trocar o modelo, alterar os parâmetros físicos ou carregar um roteiro descarta os registros anteriores e retorna às condições iniciais do ensaio. Exporte os dados antes dessas ações. Os modelos personalizados continuam disponíveis ao reiniciar; recarregar a página restaura os modelos predefinidos e descarta as personalizações e os registros.

## Parâmetros e controles

Ao abrir a aplicação, o modelo selecionado é o **Senoidal**, com as seguintes condições:

| Parâmetro | Valor padrão | Faixa permitida na interface |
| --- | --- | --- |
| x inicial | −5 m | De −100 m até 0,1 m abaixo de x final |
| x final | 5 m | De 0,1 m acima de x inicial até 100 m |
| Gravidade `g` | 9,81 m/s² | De 0 a 100 m/s² |
| Massa `m` | 12 kg | De 0,01 a 1.000 kg |
| Velocidade inicial `v₀` | 8,6 m/s | De 0 a 1.000 m/s |
| Coeficiente de atrito `μ` | 0,035 | De 0 a 1, sem unidade |

A partícula começa em `x inicial`, na altura calculada pela expressão da curva. O domínio precisa ter pelo menos 0,1 m de extensão. Os botões de referência definem `g = 9,81 m/s²` para Terra, `1,62 m/s²` para Lua e `3,71 m/s²` para Marte.

| Controle de tempo | Padrão | Opções e efeito |
| --- | --- | --- |
| Ritmo de reprodução | 1× | 0,25×; 0,5×; 1×; 2×; 3×; 4×; 5×; 6×; 7×; 8×; 9×; 10×; 15×; 20×; 25×; 30×. Altera a passagem do tempo simulado em relação ao tempo real. |
| Intervalo das amostras | 0,05 s | 0,025; 0,05; 0,1; 0,25; 0,5; 1 ou 2 s de tempo simulado. Seleciona a frequência dos registros exibidos e exportados. |
| Avançar um passo | 1/120 s | Avança o cálculo com a reprodução parada e registra o estado resultante. Pode avançar menos se houver encerramento durante o passo. |

Alterar o ritmo ou o intervalo das amostras preserva o ensaio e seus parâmetros físicos. O ritmo não muda `v₀`, e o intervalo das amostras não muda o passo de integração. A cadência externa de cálculo é de 120 avanços por segundo simulado, com refinamento interno quando necessário.

Os roteiros carregam os seguintes valores, restaurando a massa para **12 kg**, o domínio para **−5 a 5 m** e o ritmo para **1×**:

| Roteiro | Modelo | `g` (m/s²) | `v₀` (m/s) | `μ` |
| --- | --- | --- | --- | --- |
| Conservação da energia | Quadrática convexa | 9,81 | 1,5 | 0 |
| O efeito da dissipação | Quadrática convexa | 9,81 | 0 | 0,15 |
| Um experimento na Lua | Senoidal | 1,62 | 4 | 0 |

## Expressões matemáticas

Use `x` como variável e escreva as multiplicações explicitamente. Estes são os cinco modelos predefinidos:

| Modelo | Expressão |
| --- | --- |
| Senoidal | `1.2 * sen(1.25 * x)` |
| Quadrática convexa | `0.18 * x^2 - 2.4` |
| Quadrática côncava | `-0.22 * x^2 + 3` |
| Cúbica assimétrica | `0.035 * x^3 - 0.42 * x` |
| Cosseno com tendência | `0.85 * cos(1.4 * x) + 0.12 * x` |

São aceitos os operadores `+`, `-`, `*`, `/`, `^` e `**`, as constantes `pi`, `PI`, `e` e `E` e as funções `sen`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `sqrt`, `abs`, `exp`, `ln`, `log`, `log10`, `min`, `max`, `pow`, `floor`, `ceil` e `round`. As funções trigonométricas usam radianos; `ln` e `log` calculam o logaritmo natural, enquanto `log10` usa base 10.

Use ponto nos decimais; vírgulas separam argumentos, como em `pow(x, 2)`. Também é possível criar outros perfis, como `exp(-x^2)`. A expressão deve produzir valores reais e finitos no domínio escolhido; para `sqrt(x)`, por exemplo, ajuste o domínio para valores não negativos.

O desenho manual usa interpolação linear, com uma altura para cada posição `x`. Fora da região desenhada, conserva as alturas das extremidades.

## Amostras e exportação

Cada amostra registra o tempo simulado `t`, a posição horizontal `x`, a velocidade `v`, a altura `y` e as energias `Ec`, `Ep` e `Em`. O seletor **Intervalo das amostras** controla a série usada pelos gráficos, pela tabela e pelo CSV.

Mudar o intervalo atualiza os gráficos, a tabela e o CSV usando os estados já calculados, inclusive com o experimento pausado ou encerrado. As condições inicial e final e os avanços manuais também entram na série; por isso, reduzir o intervalo pela metade não garante exatamente o dobro no total de amostras.

Por exemplo, em um ensaio de exatamente 1 s, sem registros extras fora da grade regular, um intervalo de 0,05 s produz **21 amostras**, incluindo `t = 0`; com 0,025 s, são **41 amostras**. O número de intervalos dobra de 20 para 40.

A tabela mostra as últimas oito amostras, com `t`, `x`, `v`, `Ec`, `Ep` e `Em`. A altura também está disponível nos indicadores e no CSV. Em séries longas, o desenho dos gráficos temporais usa uma seleção de até 600 pontos por série, preservando extremos; isso não reduz os registros disponíveis para exportação.

O botão **Exportar dados** fica disponível a partir de duas amostras. O arquivo `curva-studio-experimento-<data-hora>.csv` contém toda a série selecionada, com as colunas:

```text
tempo_s,x_m,velocidade_m_s,altura_m,energia_cinetica_J,energia_potencial_J,energia_total_J
```

O arquivo usa UTF-8, vírgula como separador de colunas, ponto como separador decimal e até 12 algarismos significativos. A coluna `energia_total_J` corresponde à **energia mecânica `Em`**, exibida na interface. O CSV contém as amostras selecionadas, sem a expressão e os parâmetros necessários para reabrir um experimento completo.

## Variáveis e modelo físico

A partícula permanece confinada à curva `y = f(x)`. As grandezas são calculadas em unidades do Sistema Internacional:

| Variável | Unidade | Significado |
| --- | --- | --- |
| Tempo `t` | s | Tempo transcorrido na simulação. |
| Posição `x` | m | Coordenada horizontal; não representa a distância percorrida ao longo da curva. |
| Velocidade `v` | m/s | Velocidade tangencial, positiva no sentido de `x` crescente e negativa no retorno. Seu módulo é a rapidez. |
| Altura `y` | m | `y = f(x)`, medida em relação a `y = 0`; pode ser negativa. |
| Energia cinética `Ec` | J | `Ec = ½mv²`, sempre não negativa. |
| Energia potencial `Ep` | J | `Ep = mgy`; pode ser negativa abaixo de `y = 0`. |
| Energia mecânica `Em` | J | `Em = Ec + Ep`; usa os valores completos antes do arredondamento da interface. |

A massa escala as energias e se cancela na equação de aceleração deste modelo. Sem atrito, a energia mecânica deve se conservar dentro do erro numérico; com atrito, ocorre dissipação.

A integração usa Runge–Kutta de quarta ordem com refinamento interno. O experimento encerra ao atingir uma fronteira no sentido de saída ou permanecer em repouso. A velocidade momentaneamente nula em um ponto de retorno não encerra o ensaio se a gravidade puder iniciar a descida.

O modelo adota atrito com força normal aproximada e não inclui rolamento, desprendimento ou resistência do ar. Curvas suaves são mais adequadas; quinas, descontinuidades e singularidades exigem cuidado na interpretação. Consulte as [equações, hipóteses e limites do modelo](docs/MODELO_FISICO.md).

## Looping 3D — Conservação de Energia

Acesse **Looping 3D** na navegação superior. A trajetória usa uma sequência ordenada de pontos, permitindo voltar sobre `x`, formar voltas e separar trechos pela profundidade `z`. Nesta guia, `x` é a coordenada horizontal, `y` é a altura e `z` é a profundidade, todas em metros.

O modelo inicial tem raio de **2 m**, altura de partida de **6 m**, profundidade de **1,2 m**, massa de **12 kg**, gravidade de **9,81 m/s²** e velocidade inicial nula.

| Controle | Faixa na interface |
| --- | --- |
| Raio do looping | 0,5 a 10 m |
| Altura de partida | 0 a 50 m |
| Profundidade do looping | 0 a 20 m |
| Plano do desenho e coordenadas dos pontos | −100 a 100 m |
| Massa | 0,01 a 1.000 kg |
| Gravidade | 0 a 100 m/s² |
| Velocidade inicial | 0 a 1.000 m/s |

1. Use **Completar o looping** para partir de `3R` ou **Observar o retorno** para partir de `1,4R`. Ambos usam `g = 9,81 m/s²` e `v₀ = 0`.
2. Para outra geometria, ajuste raio, altura e profundidade e clique em **Gerar looping**.
3. Em **Orbitar**, arraste a cena para girar a vista. Os botões de vista e zoom alteram somente a visualização.
4. Em **Desenhar**, arraste no plano `xy` da profundidade indicada em **Plano do desenho z**. Soltar o ponteiro aplica o novo traçado, substituindo o anterior. Use pelo menos quatro pontos; o desenho aceita até 1.000 pontos.
5. Use **Editar pontos** para selecionar um ponto na cena ou na lista e alterar suas coordenadas `x`, `y` e `z`. Também é possível inserir e excluir pontos. **Distribuir profundidade** aplica uma variação gradual em `z` ao longo do traçado, a partir do plano de desenho e usando o valor do campo **Profundidade**.
6. Clique em **Iniciar looping** e acompanhe as energias, a velocidade e a posição espacial. O ritmo varia de 0,25× a 30×, e o avanço manual solicita `1/120 s`.

A partícula fica confinada a uma guia ideal **sem atrito, rotação ou perda de contato**. Em cada segmento retilíneo, o movimento usa a solução de aceleração tangencial constante `a = −g Δy/Δs`. A velocidade é calculada de acordo com a energia inicial: `v² = v₀² + 2g(y₀ − y)`. Assim, a conservação de `Em = ½mv² + mgy` faz parte do método. Este modelo é independente da integração RK4 usada no Laboratório.

Se a energia for insuficiente para vencer uma subida, a partícula retorna. Ao atingir uma extremidade do percurso ou permanecer em repouso, o ensaio encerra. No looping gerado, `R` é o raio da projeção no plano `xy`, e o topo tem altura `2R`; a regra de contato `2,5R` de um looping circular plano não é aplicada à guia confinada.

O intervalo das amostras tem padrão de **0,05 s** e opções **0,025; 0,05; 0,1; 0,25; 0,5; 1 e 2 s**. Mudar o intervalo seleciona novamente os estados calculados. O início, o encerramento e os avanços manuais são preservados. A aba **Dados 3D** mostra as últimas oito amostras; **Exportar CSV 3D** salva toda a série selecionada em `curva-studio-looping-<data-hora>.csv`:

```text
tempo_s,distancia_m,x_m,y_m,z_m,velocidade_m_s,energia_cinetica_J,energia_potencial_J,energia_mecanica_J
```

`distancia_m` representa a coordenada `s` medida desde o início ao longo da trajetória; diminui no retorno e não é a distância total percorrida. O CSV usa UTF-8, vírgula entre colunas, ponto decimal e até 12 algarismos significativos. Desenhar, editar pontos, gerar a trajetória ou alterar as condições físicas reinicia somente os registros desta guia. Recarregar a página descarta os ensaios das duas guias.

Consulte o [modelo físico e o roteiro de observação do looping](docs/LOOPING_3D.md), incluindo as diferenças entre conservação de energia e manutenção do contato.

## Desenvolvimento

O projeto utiliza **React, TypeScript, Vite, Material UI e SVG**.

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Iniciar o servidor de desenvolvimento |
| `npm run check` | Verificar tipos e símbolos não utilizados |
| `npm test` | Executar os testes de expressões, física e controle dos dois tipos de simulação |
| `npm run build` | Verificar o TypeScript e gerar a aplicação em `dist/` |
| `npm run preview` | Servir localmente a versão compilada, após o build |

Os testes incluem soluções analíticas, conservação de energia, dissipação, velocidades de até 1.000 m/s, pausa, amostragem e exportação. As suítes do looping também verificam trajetórias em três dimensões, interseções, inversões, coordenadas no CSV e preservação do estado quando a guia fica inativa.

```text
src/
├── Aplicacao/     # Tema e estilos gerais
├── componentes/   # Interface, controles, editores e gráficos
├── ganchos/       # Ciclo de execução da simulação
├── simulacao/     # Física, expressões, trajetórias e histórico
├── tipos/         # Contratos compartilhados
└── utilidades/    # Formatação numérica
scripts/          # Testes automatizados
docs/             # Modelos físicos do Laboratório e do Looping 3D
```

Os principais pontos de configuração são:

| Arquivo | Responsabilidade |
| --- | --- |
| [configuracaoPadrao.ts](src/simulacao/configuracaoPadrao.ts) | Condições iniciais, geometria do gráfico e opções de ritmo. |
| [EditorConfiguracao.tsx](src/componentes/EditorConfiguracao/EditorConfiguracao.tsx) | Limites dos campos físicos e referências de gravidade. |
| [Laboratorio.tsx](src/componentes/Laboratorio/Laboratorio.tsx) | Limites dos campos de domínio e composição da interface. |
| [useSimulacao.ts](src/ganchos/useSimulacao.ts) | Passo de integração, intervalos de amostragem e execução. |
| [modelosPadrao.ts](src/simulacao/modelosPadrao.ts) | Nomes e expressões das curvas predefinidas. |
| [roteiros.ts](src/componentes/Laboratorio/roteiros.ts) | Parâmetros dos roteiros de estudo. |
| [EstadoSimulacao.ts](src/tipos/EstadoSimulacao.ts) | Estados, grandezas e estrutura das amostras. |
| [Looping.tsx](src/componentes/Looping/Looping.tsx) | Controles, valores padrão e edição da guia 3D. |
| [looping3d.ts](src/simulacao/looping3d.ts) | Geometria espacial, energia e eventos da guia ideal. |
| [useLooping.ts](src/ganchos/useLooping.ts) | Reprodução independente, amostras e CSV 3D. |
| [VisualizadorLooping.tsx](src/componentes/Looping/VisualizadorLooping.tsx) | Projeção, câmera, desenho e seleção de pontos no espaço. |

Em `configuracaoPadrao`, `quantidadeAmostras = 220` define os pontos usados para representar a trajetória no gráfico; as amostras temporais são controladas separadamente pelo intervalo de registro. As propriedades `largura`, `altura` e `margem` definem a área de desenho. A altura física da partícula é calculada pela função `f(x)`. O campo `energiaTotal`, compartilhado entre grandezas e amostras, corresponde à energia mecânica `Em`.
