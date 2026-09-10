# Modelo físico

O Curva simula uma partícula de massa `m` confinada a uma trajetória `y = f(x)`, sob gravidade uniforme e uma resistência por atrito. A posição inicial é o limite esquerdo do domínio. Todas as grandezas físicas usam o Sistema Internacional de Unidades.

## Grandezas exibidas

| Grandeza | Cálculo | Unidade e interpretação |
| --- | --- | --- |
| Velocidade | `v` | m/s; velocidade ao longo da curva, positiva no sentido de x crescente e negativa no retorno. A rapidez é `abs(v)`. |
| Altura | `y = f(x)` | m; coordenada vertical relativa a `y = 0`. |
| Energia cinética | `Ec = m v² / 2` | J; sempre não negativa, independentemente do sentido do movimento. |
| Energia potencial | `Ep = m g y` | J; pode ser negativa abaixo de `y = 0`. |
| Energia mecânica | `Em = Ec + Ep` | J; soma calculada a partir do mesmo estado físico das demais grandezas. |

O zero da energia potencial é o eixo `y = 0`, não o mínimo da curva nem a borda do gráfico. Para `m = 2 kg`, `g = 10 m/s²`, `y = 3 m` e `v = ±4 m/s`, as energias são `Ec = 16 J`, `Ep = 60 J` e `Em = 76 J`.

As expressões de energia e a conservação na ausência de dissipação seguem [OpenStax, Physics, seção 9.2 — Mechanical Energy and Conservation of Energy](https://openstax.org/books/physics/pages/9-2-mechanical-energy-and-conservation-of-energy).

## Equações do movimento

Definindo a inclinação da curva por `θ = arctan(f′(x))`, a evolução usa:

```text
dx/dt = v / sqrt(1 + f′(x)²)
dv/dt = −g sin(θ) − μg cos(θ) sign(v)    para v ≠ 0
```

O coeficiente de atrito `μ` é adimensional. A resistência tem módulo `μmg cos(θ)` e se opõe ao movimento. A massa se cancela na aceleração; alterar apenas a massa escala as energias, sem alterar a trajetória temporal neste modelo.

Quando `v = 0`, a partícula permanece em repouso se `abs(g sin(θ)) ≤ μg cos(θ)`. Caso contrário, a gravidade inicia o movimento no sentido de descida. Uma velocidade momentaneamente nula no ápice não encerra uma subida quando ainda é possível retornar.

Sem atrito, a energia mecânica deve se conservar dentro do erro numérico. Com atrito, a taxa de dissipação prevista é `dEm/dt = −μmg cos(θ) abs(v)`. A variação observada nos gráficos também inclui o erro da aproximação numérica.

## Integração e encerramento

O núcleo em [fisica.ts](../src/simulacao/fisica.ts) integra posição e velocidade pelo método de Runge–Kutta de quarta ordem (RK4). A execução solicita avanços de `1/120 s` de tempo simulado. Dentro de cada avanço, o integrador compara um passo completo com dois meios passos para estimar o erro local, refinando os intervalos quando necessário. O deslocamento horizontal também é limitado para resolver a curva em velocidades altas.

A derivada `f′(x)` é calculada por diferenças finitas centrais no interior do domínio e diferenças unilaterais de segunda ordem próximas às fronteiras. A energia é calculada do estado resultante; não é ajustada artificialmente para impor conservação.

Inversões, repouso e chegada às fronteiras são tratados como eventos. O ensaio termina quando a partícula atinge uma fronteira no sentido de saída ou fica em repouso. A fronteira encerra a observação, sem representar uma colisão ou zerar a velocidade. Quando um evento ocorre antes do fim do avanço, o tempo registrado corresponde à duração efetivamente integrada.

Alterar o ritmo de reprodução muda a relação entre tempo real e tempo simulado. Isso preserva as equações e a cadência de integração. A execução desconsidera o tempo em abas suspensas e limita a recuperação após travamentos do navegador.

## Amostras, indicadores e CSV

Uma amostra é um registro do tempo, posição, velocidade, altura e energias de um estado calculado. O histórico conserva os estados da cadência externa de 120 Hz, a condição inicial e os registros extras de avanço manual e encerramento. Os subpassos internos do RK4 não são todos armazenados.

O intervalo selecionável é `0,025`, `0,05`, `0,1`, `0,25`, `0,5`, `1` ou `2 s`, com padrão de `0,05 s`. Mudar esse intervalo seleciona novamente o histórico já calculado, inclusive com o ensaio pausado ou concluído. A operação não altera a física nem interpola valores.

Gráficos, tabela e CSV compartilham a seleção de amostras. A condição inicial e os registros extras são preservados sem duplicar estados idênticos; por isso, reduzir o intervalo pela metade não necessariamente duplica a contagem total. Os indicadores exibem o estado atual e podem estar adiante da última amostra regular durante a execução ou pausa.

Os valores exibidos são arredondados, mas `Em` é calculada com os valores completos. A soma das parcelas visíveis pode diferir em `0,01 J` da energia mecânica exibida. O CSV usa ponto decimal e até 12 algarismos significativos, com unidades nos cabeçalhos. O histórico fica na memória da sessão e é descartado ao reiniciar, trocar as condições físicas ou recarregar a página; o CSV contém as amostras, sem os metadados completos necessários para reconstruir um ensaio.

## Hipóteses e limites

- A partícula permanece confinada à curva. Não há desprendimento, resistência do ar, rolamento ou energia de rotação.
- O atrito usa a normal aproximada `mg cos(θ)`, sem a contribuição da curvatura e da velocidade. Assim, ele não descreve a força normal completa de uma partícula sobre uma pista curva.
- A trajetória deve ter uma única altura para cada x. Curvas suaves são mais adequadas à integração; trajetórias desenhadas usam interpolação linear e podem conter quinas sem derivada definida.
- A validação por amostragem não comprova continuidade nem detecta toda singularidade entre pontos. Expressões descontínuas ou com detalhes muito estreitos exigem análise própria.
- O refinamento estima o erro local de integração, sem incluir o erro da derivada numérica ou da representação da curva. As tolerâncias não garantem um limite global de erro para qualquer ensaio. Valores não finitos ou limites de refinamento atingidos interrompem o avanço com uma mensagem de erro.
- Os eixos do gráfico são ajustados independentemente para enquadrar a trajetória. Os ângulos aparentes na tela podem diferir dos ângulos usados no cálculo físico.

## Verificação

Na raiz do projeto, execute:

```bash
npm test
npm run build
```

A suíte [testar-fisica.mjs](../scripts/testar-fisica.mjs) compara o movimento no plano e na rampa com soluções analíticas, verifica conservação e dissipação de energia, sinais, altura negativa, variação de massa e gravidade, inversões, repouso e fronteiras.

Os cinco modelos predefinidos também são verificados com `v₀ = 1000 m/s`, `m = 12 kg`, `g = 9,81 m/s²`, `μ = 0` e domínio de `−5 a 5 m`. A referência usa conservação de energia para a velocidade e quadratura de Simpson com 20.000 intervalos e derivadas analíticas para o tempo de chegada. Nesses casos, os testes exigem desvio de energia inferior a `0,001 J`, erro de velocidade de até `10⁻⁷ m/s` e erro de tempo de até `2 × 10⁻⁸ s`. Esses limites se aplicam aos cenários testados.

A suíte [testar-simulacao.mjs](../scripts/testar-simulacao.mjs) verifica a concordância entre indicadores, amostras e CSV, a seleção dos intervalos, os tempos dos eventos, a pausa, o avanço manual e a independência em relação à taxa de quadros e ao ritmo de reprodução. A suíte [testar-expressoes.mjs](../scripts/testar-expressoes.mjs) verifica a sintaxe matemática e a rejeição de entradas inválidas. A compilação verifica os tipos TypeScript e gera a aplicação para distribuição.
