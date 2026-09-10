# Looping 3D — Conservação de energia

A guia **Looping 3D** do CURVA Studio permite estudar o movimento de uma partícula em uma trajetória espacial. Ela tem desenho, condições iniciais e reprodução próprios. A guia **Laboratório** continua usando seu modelo de função `y = f(x)`.

A visualização usa **React, TypeScript e SVG nativo do navegador**, com projeção 3D implementada no próprio projeto. As bibliotecas e os arquivos responsáveis estão descritos em [Tecnologias e manutenção](#tecnologias-e-manutenção).

## Trajetória e desenho

O percurso é uma sequência ordenada de pontos `(x, y, z)`, unidos por segmentos de reta. A ordem dos pontos determina a continuidade do caminho: a partícula segue o segmento seguinte mesmo quando duas partes da trajetória se sobrepõem na imagem.

| Coordenada | Significado | Unidade |
| --- | --- | --- |
| `x` | Posição horizontal. | m |
| `y` | Altura em relação ao plano `y = 0`. A gravidade aponta no sentido de `y` decrescente. | m |
| `z` | Profundidade, perpendicular ao plano de desenho `xy`. | m |

Um looping admite mais de uma altura para o mesmo `x`, por isso não pode ser representado por uma única função `y = f(x)`. A sequência de pontos resolve essa limitação. A profundidade permite separar a entrada e a saída no espaço.

Use **Gerar looping** para começar com uma rampa de acesso, um looping e uma saída. Os campos de geometria só modificam esse modelo depois de gerar novamente. A geração substitui a trajetória e reinicia os registros desta guia.

As ferramentas disponíveis são:

- **Orbitar**: arraste a visualização ou use as setas do teclado com o gráfico selecionado para girar a câmera. As vistas **Frontal** e **Lateral** mostram os planos `xy` e `zy`; os botões de ampliação e **Enquadrar** ajustam a escala visual. Esses controles não alteram a física.
- **Desenhar**: faça um traço contínuo na vista frontal. Ao soltar o ponteiro, um desenho válido substitui a trajetória inteira. São necessários pelo menos quatro pontos, até o máximo de 1.000. Todos os pontos desse traço recebem a coordenada `z` escolhida em **Plano do desenho**. Para criar profundidade variável, edite as coordenadas ou use **Distribuir profundidade** depois de desenhar.
- **Editar pontos**: selecione um nó no gráfico, na lista ou com as setas do teclado. Altere suas coordenadas `x`, `y` e `z`; **Inserir após** acrescenta um ponto e **Excluir ponto** remove o selecionado, respeitando os limites do editor.
- **Distribuir profundidade**: substitui as coordenadas `z` por uma variação suave entre **Plano do desenho** e esse valor mais **Profundidade**. A distribuição usa a posição relativa ao longo da trajetória existente e preserva `x` e `y`.

Alterar o **Plano do desenho** não desloca os pontos já existentes. Cada novo traço substitui o anterior; o editor não concatena desenhos feitos em planos diferentes. Alterar pontos, gerar um modelo ou distribuir profundidade reinicia o ensaio.

No modelo pronto, a projeção do looping no plano `xy` segue `x = R sin(θ)` e `y = R(1 − cos(θ))`, para uma volta completa. A coordenada `z` varia ao longo da volta para separar os acessos. Portanto, `R` é o raio dessa projeção circular; com profundidade variável, não é necessariamente o raio de curvatura espacial.

## Parâmetros e reprodução

| Controle | Valor inicial | Faixa editável |
| --- | --- | --- |
| Raio do looping `R` | 2 m | 0,5 a 10 m |
| Altura de partida | 6 m | 0 a 50 m |
| Profundidade | 1,2 m | 0 a 20 m |
| Plano do desenho `z` | 0 m | −100 a 100 m |
| Coordenadas de um ponto | Conforme a trajetória | −100 a 100 m por coordenada |
| Massa `m` | 12 kg | 0,01 a 1.000 kg |
| Gravidade `g` | 9,81 m/s² | 0 a 100 m/s² |
| Velocidade inicial `v₀` | 0 m/s | 0 a 1.000 m/s |
| Vínculo com a pista | Presa | Presa ou solta |

**Iniciar looping**, **Pausar** e **Continuar** controlam a reprodução. **Reiniciar looping** volta à condição inicial e descarta os registros anteriores. Ao terminar, **Preparar novo ensaio** reinicia e deixa a simulação pronta; é necessário iniciar novamente. O avanço manual solicita `1/120 s` e permanece pausado; a chegada a um evento de encerramento pode ocorrer antes desse intervalo.

O **Ritmo** inicial é `1×`. As opções são `0,25×`, `0,5×`, `1×`, `2×`, `3×`, `4×`, `5×`, `6×`, `7×`, `8×`, `9×`, `10×`, `15×`, `20×`, `25×` e `30×`. O ritmo muda a relação entre tempo real e simulado, preservando as equações e o passo físico.

Trocar para outra guia pausa o looping e preserva sua trajetória, condições e dados. Voltar não inicia a reprodução automaticamente. Uma aba do navegador oculta não acumula tempo para o retorno. Os dados ficam na memória da página e não persistem após recarregá-la.

Os atalhos **Partida a 3R** e **Partida a 1,4R** comparam essas duas alturas iniciais. Ambos aplicam `g = 9,81 m/s²` e `v₀ = 0 m/s`, preservando a massa, o modo de contato e os valores escolhidos de raio e profundidade. Na partida a `1,4R`, a partícula presa retorna durante a subida; a solta pode perder contato antes da inversão. Em uma trajetória espacial, o resultado depende também da curvatura e do contato.

**Testar 2,4R** e **Testar 2,5R** preparam a comparação do limiar de contato: selecionam a partícula solta, zeram a profundidade e a velocidade inicial e aplicam `g = 9,81 m/s²`. O raio e a massa são preservados. O looping plano permite comparar diretamente com a previsão teórica `H = 2,5R`.

## Modelo físico

A simulação representa uma massa pontual, sem atrito, resistência do ar ou rotação. Há dois modos de contato:

- **Presa**: a restrição pode empurrar ou puxar a partícula para manter o percurso. Uma força normal de sustentação negativa indica que seria necessário puxá-la. O movimento continua na guia nessa condição.
- **Solta**: a pista pode empurrar, mas não puxar a partícula no sentido normal de sustentação. Quando a força exigida passa a ser negativa, a partícula perde contato e segue em voo sob a ação da gravidade.

Enquanto existe contato, a reação é perpendicular à tangente e não realiza trabalho. Depois do desprendimento, apenas a gravidade atua. Nos dois casos, a energia mecânica se conserva dentro da aproximação numérica, conforme o princípio apresentado em [OpenStax, University Physics, seção 8.3](https://openstax.org/books/university-physics-volume-1/pages/8-3-conservation-of-energy).

| Grandeza | Expressão e interpretação |
| --- | --- |
| Velocidade na pista | `v = ds/dt`, em m/s; `s` mede a posição ao longo do percurso. O sinal indica avanço ou retorno na sequência de pontos. A rapidez é `abs(v)`. |
| Velocidade em voo | Rapidez `sqrt(vx² + vy² + vz²)`, em m/s. O movimento deixa de ter uma coordenada tangencial na pista; suas direções são dadas por `vx`, `vy` e `vz`. |
| Energia cinética | `Ec = m (vx² + vy² + vz²) / 2 = m abs(v)² / 2`, em J. Inclui o movimento nas três direções. |
| Energia potencial | `Ep = m g y`, em J. O zero de referência é `y = 0`. |
| Energia mecânica | `Em = Ec + Ep`, em J. |
| Aceleração tangencial na pista | `dv/dt = −g dy/ds`. Depende da inclinação espacial da guia. |
| Normal de sustentação | Reação escalar `N`, em N, no sentido normal de apoio definido para a pista. No modo preso pode ser negativa; em voo é zero. |

Em cada segmento, de comprimento `L = sqrt(Δx² + Δy² + Δz²)`, a inclinação vertical é `dy/ds = Δy/L`. Acrescentar profundidade altera esse comprimento, a aceleração tangencial e o tempo de percurso. Para condições iniciais iguais, a rapidez em uma mesma altura continua obedecendo a:

```text
v² = v₀² + 2g(y₀ − y)
```

A massa escala as energias e as forças, mas se cancela na equação do movimento e na condição de desprendimento. Não há energia de rotação: a partícula representa uma massa pontual, e o tamanho do marcador na tela não define um raio físico.

## Contato e critério de desprendimento

O contato depende da geometria local e da velocidade, além da energia. Se `t̂` é a tangente unitária, `κ⃗ = dt̂/ds` é o vetor curvatura e `n̂` é a normal unitária de sustentação da pista, a reação exigida nesse sentido é:

```text
g⃗ = (0, −g, 0)
N = m [v² (κ⃗ · n̂) − g⃗ · n̂]
```

A normal de sustentação começa pela projeção do eixo `+y` no plano perpendicular à tangente. Se a tangente inicial for quase vertical, usa-se `+x` como referência. Essa normal é transportada ao longo da trajetória com a menor rotação entre tangentes sucessivas. Assim, ela acompanha a volta e aponta para baixo no topo do looping plano. A orientação pertence à pista e não se inverte quando a partícula retorna.

Uma sequência de pontos 3D não define sozinha uma superfície de apoio. O modelo adota essa orientação e uma **guia lateral ideal** que fornece a reação perpendicular à tangente e à normal de sustentação enquanto há contato. Portanto, a opção solta representa perda de sustentação nesse modelo de pista; não calcula o deslizamento lateral sobre uma superfície de largura finita. O valor `N` é a componente de sustentação, não necessariamente o módulo da reação total da pista 3D.

As tangentes e curvaturas são estimadas a partir dos pontos vizinhos. Em um vértice interno, o vetor curvatura é `κ⃗ = 2(t̂saída − t̂entrada)/(Lentrada + Lsaída)`. Nas extremidades, a curvatura é definida como zero. As curvaturas e normais dos vértices são interpoladas entre os pontos; a normal é normalizada antes de calcular a força. Em desenhos com quinas ou poucos pontos, essa é uma aproximação da curva local, não a força impulsiva exata de uma colisão com um canto. No looping pronto, os 720 segmentos da volta aproximam o círculo.

No modo solto, o núcleo procura a primeira perda de contato durante o avanço. Em cada segmento, o sinal da reação é obtido por um polinômio cúbico. Seus pontos críticos delimitam os intervalos examinados antes de localizar o primeiro zero por bisseção; assim, uma região de reação negativa não é ignorada por estar entre duas posições de um passo. O valor `N = 0` isolado no topo limite não implica desprendimento: é necessário que a continuação na pista passe a exigir uma reação negativa, considerada a tolerância numérica.

## Cálculo do movimento

O núcleo em [looping3d.ts](../src/simulacao/looping3d.ts) usa a solução analítica do movimento com aceleração constante em cada segmento:

```text
s(t + Δt) = s(t) + v(t)Δt + aΔt²/2
v(t + Δt) = v(t) + aΔt
a = −g Δy/Δs
```

A execução solicita avanços de `1/120 s`. Dentro de cada avanço, o cálculo resolve os instantes de chegada aos vértices, inversão de sentido, perda de contato e chegada às extremidades; um passo pode atravessar vários segmentos. Na pista, a observação termina ao chegar ao fim, retornar à origem ou permanecer em repouso, preservando o tempo efetivamente percorrido. As extremidades encerram a observação sem representar colisões.

Nos vértices e ao finalizar um avanço com velocidade não nula, o módulo da velocidade é recalculado pela conservação de energia, mantendo seu sinal. Isso reduz a deriva acumulada ao atravessar muitos segmentos. Portanto, **Variação de Em** próxima de zero é consequência do método adotado; não é uma medida independente da precisão do tempo ou da aproximação geométrica.

No modo preso, o caso `v₀ = 0` e altura inicial exatamente `2R` termina em **Em repouso** no topo do looping poligonal. O algoritmo não escolhe arbitrariamente para qual lado sair de um máximo com velocidade nula. No círculo ideal suave, essa condição limite corresponde à aproximação assintótica do topo; o tempo de chegada finito da polilinha não deve ser interpretado como o resultado exato da curva suave. No modo solto, a perda de contato pode acontecer antes de alcançar essa posição.

No instante de desprendimento, a velocidade inicial do voo tem o módulo e o sentido tangencial do movimento na pista. A posição e as energias permanecem contínuas. A partir desse instante, o movimento é balístico:

```text
x = xd + vx,d Δt
y = yd + vy,d Δt − g Δt²/2
z = zd + vz,d Δt
vx = vx,d
vy = vy,d − g Δt
vz = vz,d
```

O índice `d` identifica o instante de desprendimento. A coordenada `s` fica congelada na posição em que a partícula deixou a pista. Com `g > 0`, a observação do voo termina no plano `y = ymin − max(2 m, (ymax − ymin)/2)`, em que `ymin` e `ymax` são as alturas extremas da pista. Com gravidade zero, o voo é observado durante `5 s`. Esses limites encerram o registro sem representar impacto físico. Não há novo contato, colisões ou quique, mesmo que a parábola cruze a pista na imagem.

## Roteiro de observação

1. Selecione a partícula presa e comece com `R = 2 m`, altura inicial `6 m`, profundidade `1,2 m`, `m = 12 kg`, `g = 9,81 m/s²` e `v₀ = 0 m/s`. Aplique **Gerar looping** após alterar a geometria.
2. Selecione **Iniciar looping**. Na descida, a energia potencial diminui e a cinética aumenta. Na subida do looping, ocorre a troca inversa.
3. Compare o início, a base e o topo. Para essas condições, os valores de referência são:

| Posição | Altura | Rapidez | Energia cinética | Energia potencial | Energia mecânica |
| --- | --- | --- | --- | --- | --- |
| Início | 6 m | 0 m/s | 0 J | 706,32 J | 706,32 J |
| Base | 0 m | ≈ 10,850 m/s | 706,32 J | 0 J | 706,32 J |
| Topo | 4 m | ≈ 6,264 m/s | 235,44 J | 470,88 J | 706,32 J |

4. Repita com outra massa: as energias mudam proporcionalmente, enquanto o movimento permanece igual.
5. Altere a profundidade e gere novamente, mantendo as alturas. Observe a mudança no caminho e no tempo, sem alterar as velocidades previstas para uma mesma altura.
6. Reduza a energia inicial. Se ela não permitir alcançar uma região mais alta da trajetória, a partícula para momentaneamente e retorna.

Esses valores correspondem ao modelo pronto e às condições indicadas. Após editar os pontos, use as alturas efetivas da trajetória para refazer as previsões.

Para comparar contato, use **Testar 2,4R** e depois **Testar 2,5R**. No primeiro ensaio, a partícula solta se desprende antes do topo; no segundo, passa pelo topo no limite de contato. Repita `2,4R` com a partícula presa: a guia a mantém no percurso, mesmo quando precisa exercer uma reação de sustentação negativa.

## Amostras, gráficos e CSV

Uma amostra contém tempo, posição ao longo da guia, coordenadas `x`, `y`, `z`, velocidade, componentes da velocidade, normal de sustentação, fase do movimento e energias de um estado calculado. Os pontos que definem a geometria e as amostras temporais são conjuntos diferentes.

O controle **Intervalo das amostras** oferece `0,025`, `0,05`, `0,1`, `0,25`, `0,5`, `1` e `2 s`, com padrão `0,05 s`. O intervalo usa tempo simulado. Mudar a seleção recupera os estados já calculados, inclusive com a reprodução pausada ou concluída; não interpola dados nem reinicia a física.

A condição inicial, os avanços manuais, o instante de desprendimento e o encerramento são preservados sem duplicar um registro que coincida com a cadência regular. Por isso, reduzir o intervalo pela metade não necessariamente duplica a contagem total de amostras. O rastro do voo usa os estados calculados a `120 Hz` e não muda ao selecionar outro intervalo de amostras.

As visualizações **Energia** e **Velocidade** usam essa seleção. **Dados 3D** mostra as oito últimas amostras com `t`, `x`, `y`, `z`, `v`, `Ec`, `Ep`, `Em`, `N` e a fase do movimento. Os indicadores instantâneos podem estar adiante da última amostra regular. **Exportar CSV 3D** inclui toda a seleção, com estes cabeçalhos:

```text
tempo_s,distancia_m,x_m,y_m,z_m,velocidade_m_s,energia_cinetica_J,energia_potencial_J,energia_mecanica_J,vx_m_s,vy_m_s,vz_m_s,forca_normal_N,fase
```

`distancia_m` representa a coordenada `s` medida desde o primeiro ponto da trajetória; ela diminui no retorno, fica constante em voo e não é a distância total percorrida. `velocidade_m_s` tem sinal na pista e representa a rapidez em voo. As componentes `vx_m_s`, `vy_m_s` e `vz_m_s` indicam a direção espacial. `forca_normal_N` é a normal de sustentação e vale zero em voo. `fase` distingue `pista`, `voo` e `voo_encerrado`.

O CSV usa vírgula como separador, ponto decimal e até 12 algarismos significativos. A exportação não inclui a geometria completa nem os parâmetros necessários para reconstruir um ensaio.

## Alcançar o topo e manter contato são condições diferentes

Para passar pelo topo com rapidez positiva em uma guia confinada, a energia inicial deve superar a energia potencial do topo. No modelo pronto, com `g > 0`, isso exige `y₀ + v₀²/(2g) > 2R`. A igualdade é um caso limite com velocidade nula no topo, não uma garantia de completar a volta.

No modo solto, é necessário verificar também o contato. No topo de um looping circular **plano**, a condição é `N = m v²/R − mg ≥ 0`. Com partida do repouso, resulta o limiar `H = 2,5R`; uma altura maior fornece margem de contato. Essa derivação é apresentada em [OpenStax, University Physics, exemplo 7.9 — Loop-the-Loop](https://openstax.org/books/university-physics-volume-1/pages/7-3-work-energy-theorem).

Por exemplo, para `R = 1 m`, `H = 2,4 m`, `g = 9,81 m/s²`, profundidade zero e partida do repouso, a energia permite chegar ao topo com `v ≈ 2,801 m/s`. Entretanto, manter a trajetória ali exigiria `N = −0,2mg`: a pista teria de puxar a partícula. Isso é permitido no modo preso. No modo solto, o desprendimento ocorre antes, aproximadamente em `y = 1,9333 m`, com rapidez `3,0259 m/s`, conforme a solução do círculo ideal.

A regra inclui as hipóteses de loop plano circular, ausência de dissipação, `g > 0` e partida do repouso. Com velocidade inicial positiva, a condição passa a ser `H + v₀²/(2g) ≥ 2,5R`; portanto, uma altura abaixo de `2,5R` pode ser suficiente. Para a partícula presa, a condição energética continua sendo `H + v₀²/(2g) > 2R`.

O código não impõe uma barreira de altura `2,5R`: calcula a reação local. Com profundidade variável ou edição dos pontos, a curvatura espacial muda e o resultado deve ser avaliado pela condição de contato da trajetória efetiva. A dependência da aceleração normal com o raio de curvatura local é descrita em [OpenStax, University Physics, seção 6.3](https://openstax.org/books/university-physics-volume-1/pages/6-3-centripetal-force).

## Limites da representação

- O cálculo usa uma polilinha para a posição e estima a curvatura pelos pontos vizinhos para calcular o contato. Quinas não representam uma curva suave com força normal finita. Desenhos pouco amostrados ou com mudanças bruscas de direção não fornecem previsões exatas de desprendimento.
- A conservação de energia descreve a hipótese ideal adotada. Ela não demonstra que uma pista real suportaria as forças necessárias.
- A pista tem orientação de apoio e guia lateral ideais. Não há colisões entre trechos, espessura física, rolamento, novo contato após o desprendimento ou colisão com o solo. Um cruzamento não faz a partícula trocar de caminho.
- A projeção na tela pode sobrepor pontos de profundidades diferentes. Use a câmera e as coordenadas para distinguir a geometria real.
- Os números exibidos são arredondados e a execução usa aritmética de ponto flutuante. Valores arredondados podem apresentar pequenas diferenças na soma das energias.

## Tecnologias e manutenção

### Bibliotecas e recursos utilizados

O gráfico do looping é um componente próprio: não utiliza uma biblioteca de gráficos 3D como Three.js ou Plotly. Os dados e os cálculos físicos têm três coordenadas; sua representação na tela é desenhada em **SVG**, usando uma projeção ortográfica. SVG é um recurso nativo do navegador, sem dependência adicional de npm. Não há renderização por Canvas ou WebGL nesta implementação.

| Tecnologia | Função nesta guia |
| --- | --- |
| `react` e `react-dom` | Componentes, estado da interface e atualização dos elementos SVG no navegador. |
| TypeScript | Tipos das coordenadas, câmera, propriedades do visualizador e estados físicos; verificação durante o desenvolvimento e a compilação. |
| SVG e CSS | Desenho da pista, partícula, rastro do voo, eixos, grade e rótulos; aparência e adaptação do painel à tela. |
| `@mui/material` | Componentes da interface, como os botões de iniciar e exportar. Não fornece o gráfico nem os cálculos físicos. |
| `@emotion/react` e `@emotion/styled` | Infraestrutura de estilos usada pelo Material UI. O visualizador também tem seu próprio arquivo CSS. |
| `requestAnimationFrame` | API nativa que agenda as atualizações da reprodução no navegador. O cálculo físico usa um passo separado de `1/120 s`. |
| Pointer Events e APIs SVG | Interação com mouse, toque e caneta; conversão da posição do ponteiro para as coordenadas do desenho. |
| Vite e `@vitejs/plugin-react` | Servidor de desenvolvimento, atualização durante a edição e geração da aplicação para distribuição. |

As dependências e os intervalos de versão aceitos estão no [package.json](../package.json); o [package-lock.json](../package-lock.json) registra as versões resolvidas para instalação com `npm ci`. Consulte esses arquivos ao atualizar bibliotecas. O projeto também utiliza `esbuild` nos scripts de teste para preparar módulos TypeScript.

Os gráficos de **Energia** e **Velocidade** também são implementados com React e SVG, no componente compartilhado `AnaliseTemporal`. A física da guia é calculada pelos módulos do projeto, sem motor de física externo.

### Como a cena 3D é desenhada

1. O visualizador recebe os pontos da pista, a posição da partícula e o rastro do voo em metros, no formato `Ponto3D` (`x`, `y`, `z`).
2. A função `projetarRotacao()` centraliza os pontos e aplica a rotação definida pelo **azimute** e pela **elevação** da câmera. Ela produz duas coordenadas para a tela e uma profundidade para ordenar os elementos.
3. A projeção aplica uma escala uniforme e posiciona o resultado no `viewBox` SVG de `900 × 520`. Essas são unidades internas de desenho, não metros nem o tamanho fixo do painel em pixels. O eixo vertical é invertido na conversão porque, na tela, as coordenadas crescem para baixo.
4. A pista e o rastro são desenhados com elementos `<line>`, a partícula com `<circle>` e os rótulos com `<text>`. Os segmentos são ordenados pela profundidade média, e a partícula entra nessa ordenação. Isso aproxima a sobreposição visual entre trechos; não equivale ao teste de profundidade de um renderizador 3D completo.

A projeção é **ortográfica**, sem o efeito de perspectiva que aumenta objetos próximos da câmera. Orbitar e aplicar zoom mudam apenas a imagem; as coordenadas físicas, as energias e a condição de contato permanecem iguais.

No desenho livre, o componente usa a vista frontal. `getScreenCTM()`, `createSVGPoint()` e `matrixTransform()` convertem a posição do ponteiro para o sistema do SVG; a conversão inversa da escala recupera `x` e `y` em metros. Cada ponto recebe `z = profundidadeDesenho`. A profundidade variável é aplicada posteriormente pelo editor.

Ao ocorrer desprendimento, `Looping.tsx` fornece uma previsão fixa do voo, incluindo ápice e fim, para o enquadramento. O rastro cresce durante a animação, mas não recalcula continuamente os limites da câmera.

### Onde alterar cada parte

| Arquivo | Responsabilidade |
| --- | --- |
| [VisualizadorLooping.tsx](../src/componentes/Looping/VisualizadorLooping.tsx) | Projeção, câmera, zoom, ordenação visual, desenho livre e seleção dos pontos. |
| [VisualizadorLooping.css](../src/componentes/Looping/VisualizadorLooping.css) | Aparência da cena, linhas, partícula, rastro e controles de visualização. |
| [Looping.tsx](../src/componentes/Looping/Looping.tsx) | Composição da guia, formulários, cenários, edição da trajetória e conexão entre física e visualizador. |
| [looping.css](../src/componentes/Looping/looping.css) | Organização dos painéis, condições físicas, indicadores e tabela. |
| [useLooping.ts](../src/ganchos/useLooping.ts) | Reprodução, pausa, passo fixo, histórico, seleção de amostras, rastro e geração do CSV. |
| [looping3d.ts](../src/simulacao/looping3d.ts) | Geometria da pista, movimento, energia, desprendimento e voo balístico. |
| [contatoLooping3d.ts](../src/simulacao/contatoLooping3d.ts) | Tangentes, curvatura, orientação do apoio e localização da perda de contato. |
| [AnaliseTemporal.tsx](../src/componentes/AnaliseTemporal/AnaliseTemporal.tsx) | Gráficos SVG de energia e velocidade ao longo do tempo. |

Para manter essa organização, deixe os cálculos físicos nos módulos de simulação e a transformação de coordenadas para a tela no visualizador. Preserve também a distinção entre **passo físico**, **quadros da animação** e **intervalo das amostras**: são controles diferentes. Ao modificar equações, contato ou registro de dados, use os testes descritos a seguir; para mudanças na câmera ou no desenho, confira as vistas, a seleção de pontos e o rastro na interface.

## Verificação

[testar-looping.mjs](../scripts/testar-looping.mjs) verifica a geometria e o núcleo físico. [testar-controle-looping.mjs](../scripts/testar-controle-looping.mjs) compara uma rampa espacial com a solução analítica e verifica amostragem, coordenadas e energias do CSV, tempos de encerramento, pausa, reinício e independência da taxa de quadros.

[testar-contato-looping.mjs](../scripts/testar-contato-looping.mjs) verifica o limiar de contato do looping plano, a comparação entre os modos presa e solta, o instante de desprendimento, o movimento balístico e a conservação de energia durante o voo.
