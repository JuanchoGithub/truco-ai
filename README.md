
# Truco AI 🃏

¡Bienvenido a Truco AI! Una aplicación web para un solo jugador del clásico juego de cartas argentino, "Truco". Enfréntate a un oponente de IA estratégico y adaptable, aprende los secretos del juego y analiza tu propio estilo de juego.

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

*   **Oponente de IA Estratégico**: Juega contra una IA que no solo conoce las reglas, sino que también aprende de tu estilo de juego, se adapta y utiliza tácticas avanzadas como el farol (bluff) y el cebo.
*   **Múltiples Modos de Juego**:
    *   **Jugar contra la IA**: El desafío estándar.
    *   **Jugar con Ayuda**: Recibe sugerencias en tiempo real de un "asistente" de IA que te aconseja cuál es la mejor jugada.
    *   **Aprender a Jugar**: Un tutorial interactivo que te guía a través de los conceptos básicos.
    *   **Manual del Truco**: Una guía de referencia completa con todas las reglas y valores de las cartas.
    *   **Modo Simulación**: Observa a la IA estratégica jugar contra una IA "Randomizer" para entender su proceso de toma de decisiones en un entorno controlado.
*   **Inspector de Lógica de la IA**: ¿Curioso por saber por qué la IA hizo una jugada específica? Abre el panel "Lógica IA" para ver un registro detallado de su razonamiento, simulaciones y análisis de probabilidad.
*   **Análisis de Comportamiento del Jugador**: El panel "Ver Data" te muestra un perfil detallado de tu estilo de juego, analizando tus patrones de apuestas, faroles y jugadas de cartas. ¡Descubre tus fortalezas y debilidades!
*   **Voz de IA**: Activa el sonido para escuchar a la IA cantar sus jugadas y frases, creando una experiencia más inmersiva.
*   **Guardado Automático**: Tu partida se guarda automáticamente, para que puedas continuar justo donde la dejaste.

## 🎮 Cómo Jugar (Interfaz)

*   **Mesa de Juego**: El área central donde se juegan las cartas. A la izquierda está la pila de la IA, a la derecha la tuya.
*   **Tu Mano**: Tus cartas se muestran en la parte inferior en un abanico. Si es tu turno, las cartas jugables se levantarán al pasar el cursor sobre ellas.
*   **Mano de la IA**: Las cartas de la IA están en la parte superior. Puedes activar el modo "Ver Cartas" para verlas y entender mejor el juego.
*   **Barra de Acciones**: En la parte inferior central, aquí aparecen los botones para cantar Envido, Truco, o responder a las llamadas de la IA.
*   **Registro y Lógica**: En pantallas grandes, los paneles a los lados muestran el registro del juego y la lógica de la IA. En dispositivos móviles, puedes acceder a ellos a través de los botones en la barra inferior.

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

La IA te está observando. Cada acción que tomas se registra y se utiliza para construir un perfil de tu estilo de juego. Este perfil influye directamente en las decisiones futuras de la IA.

```
      [ TUS ACCIONES EN EL JUEGO ]
      - ¿Con qué puntaje cantas Envido (siendo mano vs pie)?
      - ¿Con qué fuerza de mano cantas Truco?
      - ¿Te retiras a menudo de un Truco (tasa de fold)?
      - ¿Con qué frecuencia resultan exitosos tus faroles?
      - ¿Juegas tu carta más alta al empezar una ronda?
      - ¿Respondes al Envido subiendo la apuesta o aceptando?
      - ¿Con qué frecuencia interrumpes un Truco con "Envido Primero"?
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
    1.  **Tu Tasa de Abandono (Fold Rate)**: Si te retiras a menudo, es más probable que intente un farol.
    2.  **La Presión de Juego**: Faroleará más si está desesperada.
    3.  **El Contexto**: Un farol de Envido es más probable si cree que puede robar 1 punto fácil.

*   **Cebo (Baiting)**: A veces, la mejor jugada es no hacer nada. La IA puede "cebarte" en dos escenarios clave:
    1.  **Cebo de Monstruo**: Si tiene una mano excelente tanto para el Envido (ej. 33 puntos) como para el Truco (ej. As de Espadas + Siete de Espadas), puede optar por *no* cantar Envido. El objetivo es ocultar su fuerza, dejarte pensar que tiene poco, y atraparte en un Truco o Retruco para ganar más puntos.
    2.  **Cebo de Mano Desequilibrada**: Si tiene un Envido muy bueno pero cartas muy malas para el Truco, puede optar por jugar una carta baja en silencio, esperando que *tú* cantes Envido. Esto le da la oportunidad de contraatacar con Real Envido o Falta Envido, maximizando los puntos en la única fase que puede ganar.

*   **"Parda y Canto"**: Una táctica clásica. Si en la primera mano puedes empatar ("hacer parda") con el jugador teniendo una carta muy fuerte guardada, la IA puede elegir empatar intencionadamente. Esto oculta su carta ganadora y le da una ventaja psicológica y estratégica para cantar Truco en la siguiente mano.

*   **Inferencia y Deducción**: La IA presta atención a cada jugada para deducir información sobre tu mano. Por ejemplo:
    *   **Inferencia de Envido Pasivo**: Si tienes la oportunidad de cantar Envido en la primera mano pero eliges jugar una carta en su lugar, la IA infiere que es *poco probable* que tengas un Envido muy alto (ej. 28+). Reduce la probabilidad de que tengas cartas que formen un buen Envido en sus simulaciones, permitiéndole tomar decisiones de Truco más informadas.
    *   **Inferencia de Canto**: Cuando cantas Envido o Truco, la IA utiliza tu historial de juego para estimar la fuerza probable de tu mano, ajustando su respuesta para ser más agresiva contra un farol o más cautelosa contra una apuesta de valor.

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
*   **Flor:** Si tienes tres cartas del mismo palo, tienes "Flor". El cálculo es `20 + valor carta 1 + valor carta 2 + valor carta 3`.

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
Disfruta del desafío y ¡que tengas buenas cartas!
