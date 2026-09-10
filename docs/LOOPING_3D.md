# Looping 3D — Conservação de energia

A guia **Looping 3D** do CURVA Studio permite estudar o movimento de uma partícula em uma trajetória espacial. Ela tem desenho, condições iniciais e reprodução próprios. A guia **Experimento** continua usando seu modelo de função `y = f(x)`.

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

**Iniciar looping**, **Pausar** e **Continuar** controlam a reprodução. **Reiniciar looping** volta à condição inicial e descarta os registros anteriores. Ao terminar, **Preparar novo ensaio** reinicia e deixa a simulação pronta; é necessário iniciar novamente. O avanço manual solicita `1/120 s` e permanece pausado; a chegada a um evento de encerramento pode ocorrer antes desse intervalo.

O **Ritmo** inicial é `1×`. As opções são `0,25×`, `0,5×`, `1×`, `2×`, `3×`, `4×`, `5×`, `6×`, `7×`, `8×`, `9×`, `10×`, `15×`, `20×`, `25×` e `30×`. O ritmo muda a relação entre tempo real e simulado, preservando as equações e o passo físico.

Trocar para outra guia pausa o looping e preserva sua trajetória, condições e dados. Voltar não inicia a reprodução automaticamente. Uma aba do navegador oculta não acumula tempo para o retorno. Os dados ficam na memória da página e não persistem após recarregá-la.

Os atalhos **Completar o looping** e **Observar o retorno** geram trajetórias com alturas de partida `3R` e `1,4R`, respectivamente. Ambos aplicam `g = 9,81 m/s²` e `v₀ = 0 m/s`, preservando a massa e os valores escolhidos de raio e profundidade.

## Modelo físico

A partícula permanece presa a uma **guia ideal**, sem atrito, resistência do ar ou rotação. A guia redireciona o movimento sem retirar energia. A energia mecânica se conserva quando as forças de restrição não realizam trabalho, conforme [OpenStax, University Physics, seção 8.3](https://openstax.org/books/university-physics-volume-1/pages/8-3-conservation-of-energy).

| Grandeza | Expressão e interpretação |
| --- | --- |
| Velocidade ao longo da guia | `v = ds/dt`, em m/s; `s` mede a posição ao longo do percurso. O sinal indica avanço ou retorno na sequência de pontos. A rapidez é `abs(v)`. |
| Energia cinética | `Ec = m v² / 2`, em J. Inclui o movimento nas três direções. |
| Energia potencial | `Ep = m g y`, em J. O zero de referência é `y = 0`. |
| Energia mecânica | `Em = Ec + Ep`, em J. |
| Aceleração tangencial | `dv/dt = −g dy/ds`. Depende da inclinação espacial da guia. |

Em cada segmento, de comprimento `L = sqrt(Δx² + Δy² + Δz²)`, a inclinação vertical é `dy/ds = Δy/L`. Acrescentar profundidade altera esse comprimento, a aceleração tangencial e o tempo de percurso. Para condições iniciais iguais, a rapidez em uma mesma altura continua obedecendo a:

```text
v² = v₀² + 2g(y₀ − y)
```

A massa escala as energias, mas se cancela na equação do movimento. Não há energia de rotação: a partícula representa uma massa pontual, e o tamanho do marcador na tela não define um raio físico.

## Cálculo do movimento

O núcleo em [looping3d.ts](../src/simulacao/looping3d.ts) usa a solução analítica do movimento com aceleração constante em cada segmento:

```text
s(t + Δt) = s(t) + v(t)Δt + aΔt²/2
v(t + Δt) = v(t) + aΔt
a = −g Δy/Δs
```

A execução solicita avanços de `1/120 s`. Dentro de cada avanço, o cálculo resolve os instantes de chegada aos vértices, inversão de sentido e chegada às extremidades; um passo pode atravessar vários segmentos. A observação termina ao chegar ao fim, retornar à origem ou permanecer em repouso, preservando o tempo efetivamente percorrido. As extremidades encerram a observação sem representar colisões.

Nos vértices e ao finalizar um avanço com velocidade não nula, o módulo da velocidade é recalculado pela conservação de energia, mantendo seu sinal. Isso reduz a deriva acumulada ao atravessar muitos segmentos. Portanto, **Variação de Em** próxima de zero é consequência do método adotado; não é uma medida independente da precisão do tempo ou da aproximação geométrica.

O caso `v₀ = 0` e altura inicial exatamente `2R` termina em **Em repouso** no topo do looping poligonal. O algoritmo não escolhe arbitrariamente para qual lado sair de um máximo com velocidade nula. No círculo ideal suave, essa condição limite corresponde à aproximação assintótica do topo; o tempo de chegada finito da polilinha não deve ser interpretado como o resultado exato da curva suave.

## Roteiro de observação

1. Comece com `R = 2 m`, altura inicial `6 m`, profundidade `1,2 m`, `m = 12 kg`, `g = 9,81 m/s²` e `v₀ = 0 m/s`. Aplique **Gerar looping** após alterar a geometria.
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

## Amostras, gráficos e CSV

Uma amostra contém tempo, posição ao longo da guia, coordenadas `x`, `y`, `z`, velocidade e energias de um estado calculado. Os pontos que definem a geometria e as amostras temporais são conjuntos diferentes.

O controle **Intervalo das amostras** oferece `0,025`, `0,05`, `0,1`, `0,25`, `0,5`, `1` e `2 s`, com padrão `0,05 s`. O intervalo usa tempo simulado. Mudar a seleção recupera os estados já calculados, inclusive com a reprodução pausada ou concluída; não interpola dados nem reinicia a física.

A condição inicial, os avanços manuais e o encerramento são preservados sem duplicar um registro que coincida com a cadência regular. Por isso, reduzir o intervalo pela metade não necessariamente duplica a contagem total de amostras.

As visualizações **Energia** e **Velocidade** usam essa seleção. **Dados 3D** mostra as oito últimas amostras com `t`, `x`, `y`, `z`, `v`, `Ec`, `Ep` e `Em`. Os indicadores instantâneos podem estar adiante da última amostra regular. **Exportar CSV 3D** inclui toda a seleção, com estes cabeçalhos:

```text
tempo_s,distancia_m,x_m,y_m,z_m,velocidade_m_s,energia_cinetica_J,energia_potencial_J,energia_mecanica_J
```

`distancia_m` representa a coordenada `s` medida desde o primeiro ponto da trajetória; ela diminui no retorno e não é a distância total acumulada em idas e voltas. O CSV usa vírgula como separador, ponto decimal e até 12 algarismos significativos. A exportação não inclui a geometria completa nem os parâmetros necessários para reconstruir um ensaio.

## Alcançar o topo e manter contato são condições diferentes

Para passar pelo topo com rapidez positiva em uma guia confinada, a energia inicial deve superar a energia potencial do topo. No modelo pronto, com `g > 0`, isso exige `y₀ + v₀²/(2g) > 2R`. A igualdade é um caso limite com velocidade nula no topo, não uma garantia de completar a volta.

Em uma pista que apenas empurra a partícula, seria necessário verificar também o contato. No topo de um looping circular **plano**, a condição é `N = m v²/R − mg ≥ 0`. Com partida do repouso, resulta o limiar `y₀ = 2,5R`; uma altura maior fornece margem de contato. Essa derivação é apresentada em [OpenStax, University Physics, exemplo 7.9 — Loop-the-Loop](https://openstax.org/books/university-physics-volume-1/pages/7-3-work-energy-theorem).

O simulador desta guia não calcula perda de contato nem força normal. A regra `2,5R` não é aplicada ao percurso 3D: a curvatura espacial muda com a profundidade e com a edição dos pontos. Em uma curva espacial suave, a aceleração normal depende do raio de curvatura local, como descrito em [OpenStax, University Physics, seção 6.3](https://openstax.org/books/university-physics-volume-1/pages/6-3-centripetal-force).

## Limites da representação

- O cálculo usa uma polilinha. Entre os pontos, o movimento segue trechos retos; nas junções, a direção muda preservando a rapidez. Quinas não representam uma curva suave com força normal finita.
- A conservação de energia descreve a hipótese ideal adotada. Ela não demonstra que uma pista real suportaria as forças necessárias.
- Não há colisões entre trechos, espessura física da guia ou desprendimento. Um cruzamento não faz a partícula trocar de caminho.
- A projeção na tela pode sobrepor pontos de profundidades diferentes. Use a câmera e as coordenadas para distinguir a geometria real.
- Os números exibidos são arredondados e a execução usa aritmética de ponto flutuante. Valores arredondados podem apresentar pequenas diferenças na soma das energias.

## Verificação

[testar-looping.mjs](../scripts/testar-looping.mjs) verifica a geometria e o núcleo físico. [testar-controle-looping.mjs](../scripts/testar-controle-looping.mjs) compara uma rampa espacial com a solução analítica e verifica amostragem, coordenadas e energias do CSV, tempos de encerramento, pausa, reinício e independência da taxa de quadros.
