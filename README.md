# Truco AI 🃏

¡Bienvenido a Truco AI! Una aplicación web para un solo jugador del clásico juego de cartas argentino, "Truco". Enfrentate a un oponente de IA estratégico y adaptable, aprendé los secretos del juego y analizá tu propio estilo de juego.

---

## 📜 Tabla de Contenidos

1.  [Acerca del Juego](#acerca-del-juego)
2.  [🚀 Características Principales](#-características-principales)
3.  [🎮 Cómo Jugar (Interfaz)](#-cómo-jugar-interfaz)
4.  [🧠 La IA Oponente: Un Vistazo Profundo](#-la-ia-oponente-un-vistazo-profundo)
    *   [Diagrama de Flujo de Decisiones](#diagrama-de-flujo-de-decisiones)
    *   [Modelo de Oponente Adaptativo](#modelo-de-oponente-adaptativo)
    *   [Personalidad Dinámica: La "Presión de Juego"](#personalidad-dinámica-la-presión-de-juego)
    *   [Tácticas Avanzadas](#tácticas-avanzadas)
    *   [Cómo la IA Construye y Simula Manos](#cómo-la-ia-construye-y-simula-manos)
    *   [10 Rondas de Ejemplo: El Proceso de Pensamiento de la IA](#10-rondas-de-ejemplo-el-proceso-de-pensamiento-de-la-ia)
5.  [📖 Conceptos del Juego Explicados](#-conceptos-del-juego-explicados)
    *   [Jerarquía de Cartas](#jerarquía-de-cartas)
    *   [Cálculo del Envido](#cálculo-del-envido)
    *   [Escalada del Truco](#escalada-del-truco)

---

## Acerca del Juego

El Truco es un juego de cartas que se juega con una baraja española. Es un juego de engaño, astucia y psicología. Los jugadores compiten para ser los primeros en llegar a 15 puntos. Los puntos se obtienen a través de dos mecanismos principales:

*   **El Truco**: Una apuesta sobre quién ganará las "manos" (rondas de cartas).
*   **El Envido**: Una apuesta sobre quién tiene la mejor combinación de cartas del mismo palo.

Esta aplicación simula la variante argentina del juego, con la particularidad de la "Flor".

## 🚀 Características Principales

*   **Oponente de IA Estratégico**: Jugá contra una IA que no solo conoce las reglas, sino que también aprende de tu estilo de juego, se adapta y utiliza tácticas avanzadas como el farol (bluff) y el cebo.
*   **Múltiples Modos de Juego**:
    *   **Jugar contra la IA**: El desafío estándar.
    *   **Jugar con Ayuda**: Recibí sugerencias en tiempo real de un "asistente" de IA que te aconseja cuál es la mejor jugada.
    *   **Aprender a Jugar**: Un tutorial interactivo que te guía a través de los conceptos básicos.
    *   **Manual del Truco**: Una guía de referencia completa con todas las reglas y valores de las cartas.
    *   **Modo Simulación**: Observá a la IA estratégica jugar contra una IA "Randomizer" para entender su proceso de toma de decisiones en un entorno controlado.
*   **Inspector de Lógica de la IA**: ¿Curioso por saber por qué la IA hizo una jugada específica? Abrí el panel "Lógica IA" para ver un registro detallado de su razonamiento, simulaciones y análisis de probabilidad.
*   **Análisis de Comportamiento del Jugador**: El panel "Ver Data" te muestra un perfil detallado de tu estilo de juego, analizando tus patrones de apuestas, faroles y jugadas de cartas. ¡Descubrí tus fortalezas y debilidades!
*   **Voz de IA**: Activá el sonido para escuchar a la IA cantar sus jugadas y frases, creando una experiencia más inmersiva.
*   **Guardado Automático**: Tu partida se guarda automáticamente, para que puedas continuar justo donde la dejaste.

## 🎮 Cómo Jugar (Interfaz)

*   **Mesa de Juego**: El área central donde se juegan las cartas. A la izquierda está la pila de la IA, a la derecha la tuya.
*   **Tu Mano**: Tus cartas se muestran en la parte inferior en un abanico. Si es tu turno, las cartas jugables se levantarán al pasar el cursor sobre ellas.
*   **Mano de la IA**: Las cartas de la IA están en la parte superior. Podés activar el modo "Ver Cartas" para verlas y entender mejor el juego.
*   **Barra de Acciones**: En la parte inferior central, aquí aparecen los botones para cantar Envido, Truco, o responder a las llamadas de la IA.
*   **Registro y Lógica**: En pantallas grandes, los paneles a los lados muestran el registro del juego y la lógica de la IA. En dispositivos móviles, podés acceder a ellos a través de los botones en la barra inferior.

## 🧠 La IA Oponente: Un Vistazo Profundo

La IA de Truco AI va más allá de un conjunto de reglas fijas. Utiliza un modelo de decisión complejo que combina heurísticas, simulación y un modelo adaptativo del oponente.

### Diagrama de Flujo de Decisiones

En cada turno, la IA sigue un flujo lógico para determinar su mejor movimiento. Este es un resumen detallado de su proceso:

```
          [ INICIA TURNO DE LA IA ]
                   |
                   v
        < ¿Debo responder a un canto? > --(Sí)--> [ Lógica de Respuesta ]
                   | (No)                           (Evalúa aceptar, rechazar, o escalar
                   |                                 basado en fuerza y perfil del jugador)
                   v
        < ¿Tengo Flor? > --(Sí)------------------> [ Lógica de Flor ]
                   | (No)                             (Decide si canta Flor o farolea con Envido)
                   |                                          |
                   v                                          |
        < ¿Es la primera mano? > --(Sí)--> [ Lógica de Envido ] <---'
                   | (No)                   (Evalúa si canta, farolea, o ceba
                   |                         esperando al jugador)
                   v                                    |
        < ¿Puedo cantar/escalar Truco? > --(Sí)--> [ Lógica de Truco ]
                   | (No)                           (Calcula fuerza y decide si apuesta por valor
                   |                                 o si hace un farol)
                   v                                    |
          [ Jugar la Mejor Carta ] <--------------------'
         (Ofensiva/Defensiva/Engaño/
          "Parda y Canto")
```

### Modelo de Oponente Adaptativo

La IA te está observando. Cada acción que tomás se registra y se utiliza para construir un perfil de tu estilo de juego. Este perfil influye directamente en las decisiones futuras de la IA.

```
      [ TUS ACCIONES EN EL JUEGO ]
      - ¿Con qué puntaje cantás Envido (siendo mano vs pie)?
      - ¿Con qué fuerza de mano cantás Truco?
      - ¿Te retirás a menudo de un Truco (tasa de fold)?
      - ¿Con qué frecuencia resultan exitosos tus faroles?
      - ¿Jugás tu carta más alta al empezar una ronda?
      - ¿Respondés al Envido subiendo la apuesta o aceptando?
      - ¿Con qué frecuencia interrumpís un Truco con "Envido Primero"?
               |
               v
      [ MÓDULO DE APRENDIZAJE DE LA IA ]
   (Actualiza el `opponentModel` en el estado del juego)
               |
               v
      [ PERFIL DEL JUGADOR ACTUALIZADO ]
      - Umbrales de Canto (Envido/Truco) para cada contexto.
      - Tasa de Farol (Bluff) y su éxito.
      - Tasa de Abandono (Fold Rate).
      - Estilo de Juego (Agresivo/Conservador/Predecible).
               |
               v
      [ AJUSTES ESTRATÉGICOS DE LA IA ]

      1. Decisiones Directas:
      "El jugador canta Truco con manos débiles (fuerza < 22).
       Puedo contraatacar con 'Retruco' con más confianza."

      "El jugador se retira 60% de las veces al Envido cuando no es mano.
       Intentaré un farol con puntos bajos para robar 1 punto."
      
      "El jugador responde al Truco con Envido el 70% de las veces. Puedo
       cantar Truco como un farol con más seguridad, sabiendo que es probable
       que la conversación cambie al Envido, donde el riesgo de mi farol es menor."

      2. Simulaciones Realistas (¡Nuevo!):
      "Para calcular mi probabilidad de ganar la ronda, no simularé
       contra un oponente genérico. Simularé contra el *perfil del jugador*.
       Si el jugador tiende a jugar su carta más baja cuando es mano (tasa
       de cebo del 80%), mi simulación hará que el oponente virtual juegue
       una carta baja el 80% de las veces. Esto me da una predicción
       mucho más precisa del resultado probable y mejora drásticamente mi
       decisión de cantar Truco o retirarme."
```

### Personalidad Dinámica: La "Presión de Juego"

La IA no siempre juega igual. Su "personalidad" cambia según el marcador. Esto se calcula como un valor de **Presión de Juego**, que va de -1.0 a +1.0.

```
<---------------------------------------------------------------------->
-1.0                               0.0                               +1.0
 |                                  |                                  |
CAUTELOSA                        NEUTRAL                          DESESPERADA
(IA va ganando por mucho)     (Marcador parejo)              (IA va perdiendo por mucho)

- Juega sobre seguro.            - Estrategia equilibrada.        - Toma más riesgos.
- Evita faroles arriesgados.     - Mezcla jugadas de valor        - Farolea con más frecuencia.
- Solo canta con manos fuertes.    y faroles moderados.           - Baja su umbral para cantar
                                                                    Envido y Truco.
```
Esta presión ajusta dinámicamente los umbrales de decisión de la IA, haciendo que luche más duro cuando está acorralada y sea más conservadora cuando tiene la ventaja.

### Tácticas Avanzadas

La IA emplea varias estrategias que van más allá de jugar la carta más alta.

*   **Farol (Bluff) Inteligente**: La decisión de farolear no es aleatoria. La IA considera:
    1.  **Tu Tasa de Abandono (Fold Rate)**: Si te retirás a menudo, es más probable que intente un farol.
    2.  **La Presión de Juego**: Faroleará más si está desesperada.
    3.  **El Contexto**: Un farol de Envido es más probable si cree que puede robar 1 punto fácil.

*   **Cebo (Baiting)**: A veces, la mejor jugada es no hacer nada. La IA puede "cebarte" en dos escenarios clave:
    1.  **Cebo de Monstruo**: Si tiene una mano excelente tanto para el Envido (ej. 33 puntos) como para el Truco (ej. As de Espadas + Siete de Espadas), puede optar por *no* cantar Envido. El objetivo es ocultar su fuerza, dejarte pensar que tiene poco, y atraparte en un Truco o Retruco para ganar más puntos.
    2.  **Cebo de Mano Desequilibrada**: Si tiene un Envido muy bueno pero cartas muy malas para el Truco, puede optar por jugar una carta baja en silencio, esperando que *vos* cantes Envido. Esto le da la oportunidad de contraatacar con Real Envido o Falta Envido, maximizando los puntos en la única fase que puede ganar.

*   **"Parda y Canto"**: Una táctica clásica. Si en la primera mano podés empatar ("hacer parda") con el jugador teniendo una carta muy fuerte guardada, la IA puede elegir empatar intencionadamente. Esto oculta su carta ganadora y le da una ventaja psicológica y estratégica para cantar Truco en la siguiente mano.

*   **Inferencia y Deducción**: La IA presta atención a cada jugada para deducir información sobre tu mano. Por ejemplo:
    *   **Inferencia de Envido Pasivo**: Si tenés la oportunidad de cantar Envido en la primera mano pero elegís jugar una carta en su lugar, la IA infiere que es *poco probable* que tengas un Envido muy alto (ej. 28+). Reduce la probabilidad de que tengas cartas que formen un buen Envido en sus simulaciones, permitiéndole tomar decisiones de Truco más informadas.
    *   **Inferencia de Canto**: Cuando cantás Envido o Truco, la IA utiliza tu historial de juego para estimar la fuerza probable de tu mano, ajustando su respuesta para ser más agresiva contra un farol o más cautelosa contra una apuesta de valor.

### Cómo la IA Construye y Simula Manos

La tarea principal de la IA es descifrar qué cartas es probable que tengas vos, el jugador. No puede saberlo con certeza, así que trabaja con probabilidades. Este proceso, manejado principalmente por la función `generateConstrainedOpponentHand`, puede entenderse como un embudo que filtra un conjunto masivo de posibilidades hasta reducirlo a unos pocos escenarios altamente probables.

1.  **El Universo Inicial (La Población Sin Restricciones):**
    *   Al comienzo de cualquier proceso de pensamiento, la IA primero determina las "cartas no vistas". Este grupo consiste en cada carta de la baraja de 40 cartas *excepto* la propia mano de la IA y cualquier carta ya jugada en la mesa.
    *   A partir de este grupo, la IA calcula todas las combinaciones posibles de 3 cartas (o 2, o 1, dependiendo de cuántas cartas te queden). Este conjunto inicial de combinaciones representa cada mano que *posiblemente* podrías tener. Es una población enorme y sin refinar.

2.  **Aplicando Restricciones (Filtrando la Población):**
    La IA luego aplica una serie de "filtros" o "restricciones" a esta población, descartando manos que no coinciden con los hechos conocidos o con tu comportamiento observado. Estos filtros se aplican jerárquicamente, desde lo más certero a lo más especulativo.

    *   **Restricción 1: Flor (Certeza Factual):** Si la IA sabe que tenés *Flor* (porque la cantaste), aplica el filtro más fuerte posible. Descarta cada combinación de mano de la población que no esté compuesta por tres cartas del mismo palo. Esto reduce drásticamente las posibilidades.

    *   **Restricción 2: Valor del Envido (Certeza Factual):** Si tuviste un enfrentamiento de *Envido* y revelaste tu puntaje (ej., "31"), la IA usa este hecho. Filtra la población para incluir solo manos que calculen ese valor exacto de Envido. Una mano que sume 28 sería descartada si revelaste que tenías 31.

    *   **Restricción 3: Truco Conductual (Inferencia Basada en Modelo):** Si cantás "Truco" temprano, la IA consulta su modelo adaptativo de tu estilo de juego. Analiza tu historial para ver la fuerza de mano promedio que tenés cuando cantás Truco. Luego, filtra la población, manteniendo solo las manos que caen dentro de un rango de fuerza probable consistente con tu comportamiento pasado. Descarta manos que son "demasiado débiles" o "demasiado fuertes" para *tu estilo específico* de cantar Truco.

    *   **Restricción 4: Envido Pasivo (Inferencia por Inacción):** Este es un filtro sutil pero poderoso. Si tuviste la oportunidad de cantar Envido pero elegiste jugar una carta en su lugar, la IA infiere que probablemente *no* tenés un puntaje de Envido alto. Luego, filtra la población para reducir la probabilidad de manos con puntos de Envido altos, reflejando tu juego pasivo. No las elimina por completo (¡podrías estar engañando!), pero les resta importancia.

3.  **Muestreo Estratificado (Creando Manos Representativas para Simulación):**
    Después de aplicar las restricciones, la población de manos posibles todavía puede ser grande. Para simular el resultado de la ronda de manera eficiente, la IA no prueba contra cada posibilidad. En su lugar, utiliza una técnica llamada **Muestreo Estratificado**:
    1.  Ordena toda la población restante de manos posibles de la más débil a la más fuerte.
    2.  Divide esta lista ordenada en diez grupos (deciles).
    3.  Luego, elige una mano al azar del **grupo más fuerte** (un "mejor caso" plausible para vos), una de los **grupos intermedios** (un "caso promedio"), y una del **grupo más débil** (un "peor caso").

Estas tres manos—**Fuerte, Media y Débil**—se convierten en la población final y representativa contra la que la IA simula para calcular su probabilidad de ganar la ronda y tomar su decisión final.

### 10 Rondas de Ejemplo: El Proceso de Pensamiento de la IA

Aquí hay 10 rondas que demuestran cómo estos sistemas se combinan para crear un comportamiento inteligente y adaptativo.

---

#### **Ronda 1: Caso Base (Sin Información Específica)**

*   **Escenario:** Primera ronda del juego. Marcador 0-0. La IA es "mano" (juega primero).
*   **Mano de la IA:** [7 de Espadas, 6 de Oros, 4 de Bastos]
*   **Acción del Jugador:** Ninguna todavía. Es el turno de la IA de empezar.
*   **Proceso de Pensamiento de la IA:**
    1.  **Restricción Aplicada:** Ninguna. No hay historial de juego ni acciones del jugador para analizar.
    2.  **Generación de Población:** La población es cada posible mano de 3 cartas que se puede formar con las 37 cartas no vistas. Es un conjunto masivo y sin restricciones.
    3.  **Muestreo Estratificado:** La IA ordena todas las posibles manos del oponente por fuerza y toma tres muestras:
        *   **Mano Fuerte Simulada:** [As de Espadas, As de Bastos, 3 de Copas]
        *   **Mano Media Simulada:** [3 de Espadas, Rey de Oros, 5 de Bastos]
        *   **Mano Débil Simulada:** [5 de Oros, 6 de Bastos, 4 de Copas]
    4.  **Simulación y Decisión:** La IA simula jugar sus cartas contra estas tres manos. Ve que empezar con su poderoso **7 de Espadas** gana la mano contra las manos simuladas media y débil, y obliga al oponente a usar una carta de primer nivel de la mano fuerte. Decide que esta es la jugada óptima para establecer el control.
*   **Acción de la IA:** Juega el **7 de Espadas**.

---

#### **Ronda 2: Inferencia de Envido Pasivo**

*   **Escenario:** Marcador IA 2 - Jugador 1. El Jugador es "mano".
*   **Mano de la IA:** [3 de Oros, 3 de Copas, 7 de Bastos]
*   **Acción del Jugador:** Juega el **Rey de Espadas** sin cantar Envido.
*   **Proceso de Pensamiento de la IA:**
    1.  **Restricción Aplicada:** **Inferencia de Envido Pasivo.** El jugador tuvo una clara oportunidad de cantar Envido pero no lo hizo.
    2.  **Generación de Población:** La IA consulta su modelo del jugador, que indica que el jugador usualmente canta Envido con 27 o más. La IA filtra su población de posibles manos del oponente, reduciendo significativamente la probabilidad de manos con puntajes de Envido de 27+. Asume que es probable que el jugador tenga cartas de palos mixtos o un par de bajo puntaje.
    3.  **Muestreo Estratificado:**
        *   **Mano Fuerte Simulada:** [As de Espadas, 7 de Espadas, 4 de Bastos] (Alto valor de Truco, pero solo 4 de Envido)
        *   **Mano Media Simulada:** [2 de Oros, Caballo de Bastos, 5 de Copas] (Bajo Truco, 5 de Envido)
        *   **Mano Débil Simulada:** [6 de Copas, 5 de Oros, 4 de Bastos] (Bajo Truco, 6 de Envido)
    4.  **Simulación y Decisión:** El puntaje de Envido de la IA es 26 (por los dos 3s). La inferencia de que el jugador probablemente tiene menos de 27 le da a la IA una confianza inmensa. Ahora es muy probable que su 26 gane.
*   **Acción de la IA:** Canta **"Envido"**.

---

#### **Ronda 3: Inferencia de Truco Conductual**

*   **Escenario:** Marcador 5-5. La IA es "mano".
*   **Mano de la IA:** [As de Bastos, 2 de Oros, 5 de Copas]
*   **Acción del Jugador:** Canta **"Truco"** inmediatamente al inicio de la ronda.
*   **Proceso de Pensamiento de la IA:**
    1.  **Restricción Aplicada:** **Inferencia de Truco Conductual.**
    2.  **Generación de Población:** La IA revisa su `opponentModel`. Ve que el jugador ha cantado Truco temprano 4 veces en el pasado, con una fuerza de mano promedio de 24. Filtra la población de manos posibles, manteniendo solo aquellas con una fuerza de Truco entre 20 y 28. Esto elimina manos monstruosas (como As de Espadas + 7 de Espadas) y manos de farol muy débiles, enfocándose en un rango consistente con la agresión observada del jugador.
    3.  **Muestreo Estratificado:**
        *   **Mano Fuerte Simulada:** [7 de Espadas, 3 de Oros, 4 de Copas] (Fuerza: 26)
        *   **Mano Media Simulada:** [3 de Bastos, Rey de Espadas, 6 de Oros] (Fuerza: 24)
        *   **Mano Débil Simulada:** [2 de Espadas, Caballo de Oros, Sota de Bastos] (Fuerza: 20)
    4.  **Simulación y Decisión:** La fuerza de la mano de la IA es alta (el As de Bastos es la segunda mejor carta). Sus simulaciones muestran una tasa de victoria >70% contra esta población restringida. El historial agresivo del jugador sugiere que este canto de Truco es probablemente por valor, pero la mano de la IA es lo suficientemente fuerte para competir y probablemente ganar.
*   **Acción de la IA:** Responde **"Quiero"**.

---

#### **Ronda 4: Restricción por Enfrentamiento de Envido**

*   **Escenario:** Marcador 8-7. El Jugador es "mano". El jugador y la IA tienen un enfrentamiento de Envido.
*   **Acción del Jugador:** El jugador revela que tenía **31 de Envido**.
*   **Proceso de Pensamiento de la IA (en su siguiente turno):**
    1.  **Restricción Aplicada:** **Certeza de Valor de Envido.**
    2.  **Generación de Población:** La IA ahora sabe un hecho concreto. Descarta TODAS las manos posibles de su población excepto aquellas que suman exactamente 31 puntos (ej., un 7 y un 4 del mismo palo, o un 6 y un 5 del mismo palo).
    3.  **Muestreo Estratificado:** Todas las manos de muestra ahora se construirán a partir de este grupo filtrado. Los conceptos de "fuerte" y "débil" ahora se refieren al *valor de Truco* de las cartas restantes.
        *   **Mano Fuerte Simulada:** [7 de Oros, 4 de Oros, As de Espadas] (Versión fuerte en Truco de un 31)
        *   **Mano Media Simulada:** [6 de Bastos, 5 de Bastos, Caballo de Copas] (Versión media en Truco)
        *   **Mano Débil Simulada:** [7 de Copas, 4 de Copas, 5 de Espadas] (Versión débil en Truco)
    4.  **Simulación y Decisión:** Esta información es crítica. La IA sabe que el jugador *debe* tener dos cartas del mismo palo. Esto le ayuda a predecir qué cartas es probable que estén fuera de juego y a calcular mejor sus posibilidades en la fase de Truco.

---

#### **Ronda 5: Restricción por Flor**

*   **Escenario:** Marcador 10-10. El Jugador es "mano".
*   **Acción del Jugador:** Canta **"¡FLOR!"**.
*   **Proceso de Pensamiento de la IA (en su respuesta):**
    1.  **Restricción Aplicada:** **Certeza de Flor.**
    2.  **Generación de Población:** La IA descarta inmediatamente todas las combinaciones de manos que no sean tres cartas del mismo palo. Itera a través de cada uno de los cuatro palos para ver qué Flores son posibles dadas las cartas no vistas.
    3.  **Muestreo Estratificado:** La población ahora es solo de manos con Flor.
        *   **Mano Fuerte Simulada:** [7 de Espadas, 6 de Espadas, 5 de Espadas] (38 de Flor)
        *   **Mano Media Simulada:** [5 de Oros, 4 de Oros, 2 de Oros] (31 de Flor)
        *   **Mano Débil Simulada:** [4 de Bastos, 2 de Bastos, 1 de Bastos] (27 de Flor)
    4.  **Simulación y Decisión:** La IA revisa su propia mano. No tiene Flor. Su única opción es conceder los puntos.
*   **Acción de la IA:** Responde **"Son buenas"**.

---

#### **Ronda 6: Combinación (Envido + Truco)**

*   **Escenario:** Marcador 12-12. Jugador es mano. El jugador canta "Envido", la IA acepta con 28, el jugador gana con 30. Ahora es el turno de la IA de jugar una carta en la primera mano.
*   **Acción del Jugador:** Ganó el Envido con 30.
*   **Proceso de Pensamiento de la IA:**
    1.  **Restricción Aplicada:** **Certeza de Valor de Envido (30).**
    2.  **Generación de Población:** La IA filtra la población para incluir solo manos que suman 30 de Envido (ej., 7+3 o 6+4 del mismo palo).
    3.  **Muestreo Estratificado:**
        *   **Mano Fuerte Simulada:** [7 de Espadas, 3 de Espadas, 2 de Oros]
        *   **Mano Media Simulada:** [6 de Bastos, 4 de Bastos, Caballo de Copas]
        *   **Mano Débil Simulada:** [7 de Copas, 3 de Copas, 5 de Oros]
    4.  **Simulación y Decisión:** La IA ahora tiene una imagen muy clara. Sabe que el jugador tiene dos cartas del mismo palo. Esto mejora significativamente su simulación de `calculateTrucoStrength`. Si su propia mano es muy fuerte, ahora estará mucho más segura al cantar **"Truco"** porque tiene una mejor idea de a qué se enfrenta.

---

#### **Ronda 7: Combinación (Flor + Truco)**

*   **Escenario:** Marcador 6-8. El jugador canta "Flor". La IA no tiene Flor y lo reconoce. Ahora es el turno del jugador de jugar una carta, e inmediatamente canta **"Truco"**.
*   **Acción del Jugador:** Cantó "Truco" después de revelar que tiene Flor.
*   **Proceso de Pensamiento de la IA:**
    1.  **Restricción Aplicada:** **Certeza de Flor.**
    2.  **Generación de Población:** La población se filtra para incluir *solo* manos con Flor, como en la Ronda 5.
    3.  **Muestreo Estratificado:** Igual que en la Ronda 5, las muestras serán todas manos de un solo palo.
    4.  **Simulación y Decisión:** Este es un momento crucial. Una mano con Flor suele ser débil para el Truco (ej., 4, 5, 6 de Bastos). Sin embargo, una Flor de Espadas (ej., As, 7, 6) es una mano monstruosa para el Truco. La simulación de la IA mostrará un amplio rango de resultados. Si la propia mano de la IA es mediocre (ej., un 3 y un Rey), sabe que no puede vencer a una Flor fuerte y probablemente se retirará. Si la IA tiene el As de Bastos y un 2, podría aceptar, esperando que la Flor del jugador sea de un palo débil como Oros o Copas.

---

#### **Ronda 8: Inferencia de la IA a partir de una Jugada de Carta Alta**

*   **Escenario:** Marcador 9-11. El Jugador es mano.
*   **Acción del Jugador:** Empieza la primera mano con el **7 de Espadas**.
*   **Proceso de Pensamiento de la IA:**
    1.  **Restricción Aplicada:** Inferencia general, no un filtro específico. El jugador ha revelado una de sus cartas.
    2.  **Generación de Población:** La IA elimina el 7 de Espadas del grupo de `unseenCards`. La población de manos posibles para el jugador es ahora todas las combinaciones de 2 cartas de las cartas no vistas restantes.
    3.  **Muestreo Estratificado:** Las muestras serán manos de 2 cartas.
    4.  **Simulación y Decisión:** La IA piensa: "El jugador usó su tercera mejor carta para empezar. Esto significa que *no* tiene el As de Espadas ni el As de Bastos." Esto cambia drásticamente su propia evaluación. Si la IA tiene el As de Espadas, su confianza se dispara, sabiendo que ahora tiene la carta imbatible.

---

#### **Ronda 9: Presión de Final de Juego y Farol**

*   **Escenario:** Marcador IA 13 - Jugador 14. La IA es mano y está perdiendo.
*   **Mano de la IA:** [Rey de Oros, 5 de Espadas, 4 de Copas] (Una mano débil).
*   **Acción del Jugador:** Ninguna todavía.
*   **Proceso de Pensamiento de la IA:**
    1.  **Restricción Aplicada:** Ninguna todavía, pero la "Presión de Juego" interna de la IA está al máximo (+1.0, Desesperada).
    2.  **Generación de Población:** Sin restricciones.
    3.  **Simulación y Decisión:** El `calculateTrucoStrength` normal de la IA muestra una probabilidad de victoria muy baja (< 30%). Sin embargo, su lógica de `getTrucoCall` está fuertemente modificada por la presión del juego. También revisa el `opponentModel` y ve que el jugador tiene una tasa de abandono del 50% a los cantos de Truco cuando no es "mano".
*   **Razonamiento de la IA:** "Mi mano es débil. Si juego normalmente, probablemente perderé el juego. Sin embargo, el jugador a veces se retira, y estoy en una situación desesperada. La recompensa potencial de ganar el juego con un farol supera el riesgo de perder esta ronda."
*   **Acción de la IA:** Canta **"Truco"** como un puro farol.

---

#### **Ronda 10: Cebo Engañoso con "Mano Monstruo" de la IA**

*   **Escenario:** Marcador 3-3. La IA es mano.
*   **Mano de la IA:** [As de Espadas, 7 de Espadas, 6 de Oros] (Una mano monstruosa para el Truco y 26 para el Envido).
*   **Acción del Jugador:** Ninguna todavía.
*   **Proceso de Pensamiento de la IA:**
    1.  **Restricción Aplicada:** Ninguna. Esta es una verificación estratégica especial dentro de la propia lógica de la IA (`localAiService.ts`).
    2.  **Generación de Población y Simulación:** La IA calcula la fuerza de su mano y sus puntos de Envido. Reconoce que tiene una mano de élite para ambas fases del juego.
    3.  **Decisión Estratégica:** La lógica de la IA contiene una rutina de "Cebo con Mano Monstruo". Razona: "Mi mano es increíble. Si canto mi decente 26 de Envido, el jugador sabrá que tengo cartas altas (como el 6) y será muy cauteloso cuando luego cante Truco. Puedo ganar más puntos ocultando mi fuerza."
*   **Razonamiento de la IA:** "Sacrificaré mi probable victoria en el Envido para tender una trampa. No cantaré Envido. Jugaré una carta y esperaré a que el jugador subestime mi mano y, con suerte, caiga en mi canto de Truco."
*   **Acción de la IA:** Juega el **6 de Oros** (una carta buena pero no la mejor) y permanece en silencio, tentando al jugador.

---

## 📖 Conceptos del Juego Explicados

### Jerarquía de Cartas

El valor de las cartas para ganar las manos del Truco, de la más fuerte a la más débil.

```
1.  As de Espadas (El Ancho de Espada)
2.  As de Bastos (El Ancho de Basto)
3.  Siete de Espadas
4.  Siete de Oros
5.  Todos los Tres
6.  Todos los Dos
7.  Ases Falsos (As de Oros y Copas)
8.  Todos los Reyes (12)
9.  Todos los Caballos (11)
10. Todas las Sotas (10)
11. Sietes Falsos (Siete de Bastos y Copas)
12. Todos los Seis
13. Todos los Cincos
14. Todos los Cuatros
```

### Cálculo del Envido

Se utiliza para la apuesta de "tantos".

*   **Con dos cartas del mismo palo:**

    ```
    Tu mano: [ 7 Oros ] [ 5 Oros ] [ 2 Bastos ]

    Cálculo: 20 (por tener dos del mismo palo) + 7 + 5 = 32 Puntos de Envido
    ```

*   **Con cartas de palos diferentes:**

    ```
    Tu mano: [ 7 Oros ] [ 5 Espadas ] [ 2 Bastos ]

    Cálculo: Se toma el valor de la carta más alta (que no sea figura). En este caso, 7 Puntos.
    ```
*   **Flor:** Si tenés tres cartas del mismo palo, tenés "Flor". El cálculo es `20 + valor carta 1 + valor carta 2 + valor carta 3`.

### Escalada del Truco

El Truco es una apuesta sobre la ronda. Si un jugador canta, el otro puede aceptar, rechazar o subir la apuesta.

```
          +--> [ QUIERO ] --> Juegan por 2 Puntos
          |
[ TRUCO ] --+--> [ NO QUIERO ] --> El que cantó gana 1 Punto
          |
          +--> [ RETRUCO ] --+--> [ QUIERO ] --> Juegan por 3 Puntos
                             |
                             +--> [ NO QUIERO ] --> El que cantó gana 2 Puntos
                             |
                             +--> [ VALE CUATRO ] --+--> [ QUIERO ] --> Juegan por 4 Puntos
                                                   |
                                                   +--> [ NO QUIERO ] --> El que cantó gana 3 Puntos
```

---
¡Disfrutá del desafío y que tengas buenas cartas!
