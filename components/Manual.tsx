
import React, { useState } from 'react';
import Card from './Card';
import { Card as CardType, Suit } from '../types';

interface ManualProps {
  onExit: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-8 p-4 bg-black/20 rounded-lg border-2 border-yellow-800/30">
    <h2 className="text-2xl font-cinzel text-yellow-300 mb-4 border-b-2 border-yellow-800/50 pb-2">{title}</h2>
    <div className="space-y-4 text-gray-200 leading-relaxed text-base prose prose-invert max-w-none prose-p:text-gray-200 prose-strong:text-yellow-200 prose-headings:text-yellow-300">{children}</div>
  </section>
);

const Example: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="p-3 bg-green-900/40 border border-yellow-600/30 rounded-md">
        <strong className="text-yellow-200 block mb-2">{title}</strong>
        {children}
    </div>
);

const CardDisplay: React.FC<{ card: CardType, label?: string, displayMode: 'image' | 'local-image' | 'fallback' }> = ({ card, label, displayMode }) => (
    <div className="inline-flex flex-col items-center mx-1">
        <Card card={card} size="small" displayMode={displayMode} />
        {label && <span className="text-xs mt-1 text-yellow-200 text-center">{label}</span>}
    </div>
);

// New component for stacked/fanned cards
const CardPileDisplay: React.FC<{ cards: CardType[], label: string, displayMode: 'image' | 'local-image' | 'fallback' }> = ({ cards, label, displayMode }) => (
    <div className="inline-flex flex-col items-center text-center mx-4 my-2" style={{ width: '160px' }}>
        <div className="relative h-[150px] w-full flex items-center justify-center">
            {cards.map((card, index) => {
                const centerOffset = index - (cards.length - 1) / 2;
                const rotation = centerOffset * 16; // Increased fanning angle
                const translateX = centerOffset * 12; // Added horizontal spread
                const translateY = Math.abs(centerOffset) * 5; // A slight arc
                return (
                    <div
                        key={`${card.rank}-${card.suit}`}
                        className="absolute"
                        style={{
                            transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`
                        }}
                    >
                        <Card card={card} size="small" displayMode={displayMode} />
                    </div>
                );
            })}
        </div>
        <span className="text-xs mt-2 text-yellow-200 font-semibold">{label}</span>
    </div>
);

const ModeButton: React.FC<{
    mode: 'image' | 'local-image' | 'fallback';
    currentMode: 'image' | 'local-image' | 'fallback';
    setMode: (mode: 'image' | 'local-image' | 'fallback') => void;
    children: React.ReactNode;
}> = ({ mode, currentMode, setMode, children }) => {
    const isActive = mode === currentMode;
    return (
        <button
            onClick={() => setMode(mode)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                isActive
                    ? 'bg-yellow-600 text-white font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
            }`}
        >
            {children}
        </button>
    );
};


const Manual: React.FC<ManualProps> = ({ onExit }) => {
    const [cardDisplayMode, setCardDisplayMode] = useState<'image' | 'fallback' | 'local-image'>('image');
    const SUITS: Suit[] = ['espadas', 'bastos', 'oros', 'copas'];

    const tres: CardType[] = SUITS.map(suit => ({ rank: 3, suit }));
    const dos: CardType[] = SUITS.map(suit => ({ rank: 2, suit }));
    const anchosFalsos: CardType[] = [{ rank: 1, suit: 'oros' }, { rank: 1, suit: 'copas' }];
    const reyes: CardType[] = SUITS.map(suit => ({ rank: 12, suit }));
    const caballos: CardType[] = SUITS.map(suit => ({ rank: 11, suit }));
    const sotas: CardType[] = SUITS.map(suit => ({ rank: 10, suit }));
    const sietesFalsos: CardType[] = [{ rank: 7, suit: 'copas' }, { rank: 7, suit: 'bastos' }];
    const seis: CardType[] = SUITS.map(suit => ({ rank: 6, suit }));
    const cincos: CardType[] = SUITS.map(suit => ({ rank: 5, suit }));
    const cuatros: CardType[] = SUITS.map(suit => ({ rank: 4, suit }));

  return (
    <div className="h-screen bg-green-900 text-white font-lora flex flex-col items-center p-2 lg:p-4" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')" }}>
        <div className="w-full max-w-5xl flex justify-between items-center mb-4 flex-shrink-0 px-2 gap-4">
            <h1 className="text-3xl lg:text-4xl font-cinzel text-yellow-300" style={{ textShadow: '2px 2px 4px #000' }}>Manual del Truco</h1>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-yellow-200">
                    <span className="hidden sm:inline">Vistas:</span>
                    <ModeButton mode="fallback" currentMode={cardDisplayMode} setMode={setCardDisplayMode}>SVG</ModeButton>
                    <ModeButton mode="image" currentMode={cardDisplayMode} setMode={setCardDisplayMode}>Remoto</ModeButton>
                    <ModeButton mode="local-image" currentMode={cardDisplayMode} setMode={setCardDisplayMode}>Local</ModeButton>
                </div>
                <button onClick={onExit} className="px-4 py-2 text-sm rounded-md border-2 bg-red-700/80 border-red-500 text-white transition-colors hover:bg-red-600/90 flex-shrink-0">Volver al Menú</button>
            </div>
        </div>
        <div className="w-full max-w-5xl overflow-y-auto flex-grow p-2 lg:p-4 bg-black/40 rounded-lg border-2 border-yellow-900/50">
            <Section title="Objetivo del Juego">
                <p>El Truco es un juego de cartas de origen español muy popular en Argentina. El objetivo es ser el primer jugador en alcanzar <strong>15 puntos</strong>. Los puntos se ganan a través de dos tipos de apuestas: el <strong>Envido</strong> y el <strong>Truco</strong>.</p>
            </Section>

            <Section title="Diseño de las Cartas">
                <p>Esta aplicación utiliza imágenes de una baraja española clásica. También puedes cambiar a una vista de estilo SVG más simple usando el interruptor en la parte superior. A continuación se muestra el reverso de la carta utilizado en el juego.</p>
                <div className="flex justify-center mt-4">
                    <div className="flex flex-col items-center">
                        <Card isFaceDown={true} />
                        <span className="text-xs mt-2 text-yellow-200">Reverso de la Carta</span>
                    </div>
                </div>
            </Section>

            <Section title="Valor de las Cartas (Fuerza para el Truco)">
                <p>En el Truco, las cartas no valen por su número, sino por su jerarquía. Esta es la lista de cartas de la más a la menos poderosa. ¡Aprendétela bien, es la clave para ganar!</p>
                <div className="flex flex-wrap gap-2 justify-center bg-black/20 p-2 rounded-md">
                    <CardDisplay card={{ rank: 1, suit: 'espadas' }} label="1. As de Espadas" displayMode={cardDisplayMode} />
                    <CardDisplay card={{ rank: 1, suit: 'bastos' }} label="2. As de Bastos" displayMode={cardDisplayMode} />
                    <CardDisplay card={{ rank: 7, suit: 'espadas' }} label="3. Siete de Espadas" displayMode={cardDisplayMode} />
                    <CardDisplay card={{ rank: 7, suit: 'oros' }} label="4. Siete de Oros" displayMode={cardDisplayMode} />
                </div>
                <div className="flex flex-wrap justify-center mt-6">
                    <CardPileDisplay cards={tres} label="5. Los Tres" displayMode={cardDisplayMode} />
                    <CardPileDisplay cards={dos} label="6. Los Dos" displayMode={cardDisplayMode} />
                    <CardPileDisplay cards={anchosFalsos} label="7. Ases Falsos" displayMode={cardDisplayMode} />
                    <CardPileDisplay cards={reyes} label="8. Los Reyes (12)" displayMode={cardDisplayMode} />
                    <CardPileDisplay cards={caballos} label="9. Los Caballos (11)" displayMode={cardDisplayMode} />
                    <CardPileDisplay cards={sotas} label="10. Las Sotas (10)" displayMode={cardDisplayMode} />
                    <CardPileDisplay cards={sietesFalsos} label="11. Sietes Falsos" displayMode={cardDisplayMode} />
                    <CardPileDisplay cards={seis} label="12. Los Seis" displayMode={cardDisplayMode} />
                    <CardPileDisplay cards={cincos} label="13. Los Cincos" displayMode={cardDisplayMode} />
                    <CardPileDisplay cards={cuatros} label="14. Los Cuatros" displayMode={cardDisplayMode} />
                </div>
            </Section>

            <Section title="Cómo se Juega una Ronda">
                <p>Cada ronda consiste en hasta 3 "manos" o "trucos". Al principio, un jugador es <strong>"mano"</strong>, lo que significa que juega primero en la primera mano. El jugador que gana una mano, juega primero en la siguiente.</p>
                <p>El jugador que gane 2 de las 3 manos, gana la ronda. Si hay un empate (<strong>"parda"</strong>) en la primera mano, el ganador de la segunda mano gana la ronda. Si se empata la segunda mano, el ganador de la primera gana la ronda. Si se empatan las tres manos, el jugador que era "mano" al principio de la ronda, gana.</p>
            </Section>

            <Section title="El Envido: La Apuesta por los Tantos">
                <p>El Envido se apuesta <strong>solo en la primera mano de la ronda</strong>, antes de que ambos jugadores hayan tirado su carta. Se trata de quién tiene la puntuación más alta en la mano.</p>
                <ul>
                    <li>Si tenés <strong>dos cartas del mismo palo</strong>, sumás sus valores y le agregás <strong>20 puntos</strong>. (Las figuras 10, 11 y 12 valen 0).</li>
                    <li>Si tenés las <strong>tres cartas de palos diferentes</strong>, tu envido es el valor de tu carta más alta (figuras valen 0).</li>
                </ul>
                <div className="space-y-3">
                    <Example title="Ejemplo 1: 31 de Envido">
                        <div className="flex gap-2">
                            <CardDisplay card={{rank: 5, suit: 'oros'}} displayMode={cardDisplayMode} />
                            <CardDisplay card={{rank: 6, suit: 'oros'}} displayMode={cardDisplayMode} />
                            <CardDisplay card={{rank: 1, suit: 'espadas'}} displayMode={cardDisplayMode} />
                        </div>
                        <p className="mt-2 text-sm">El 5 de Oros y 6 de Oros suman 11. Más 20 por ser del mismo palo = <strong>31 puntos</strong>.</p>
                    </Example>
                    <Example title="Ejemplo 2: 7 de Envido">
                        <div className="flex gap-2">
                            <CardDisplay card={{rank: 1, suit: 'espadas'}} displayMode={cardDisplayMode} />
                            <CardDisplay card={{rank: 5, suit: 'oros'}} displayMode={cardDisplayMode} />
                            <CardDisplay card={{rank: 7, suit: 'copas'}} displayMode={cardDisplayMode} />
                        </div>
                        <p className="mt-2 text-sm">Todas las cartas son de palos distintos. La más alta es el 7 = <strong>7 puntos</strong>.</p>
                    </Example>
                </div>
                <h3 className="text-xl font-cinzel mt-4">Cantos del Envido</h3>
                <p>Podés cantar "Envido" (vale 2 puntos), "Real Envido" (vale 3 puntos) o "Falta Envido" (vale los puntos que le faltan al oponente para ganar la partida). Tu oponente puede aceptar ("Quiero"), rechazar ("No Quiero") o subir la apuesta.</p>
            </Section>

            <Section title="La Flor: La Mano Perfecta">
                <p>Si recibís <strong>tres cartas del mismo palo</strong>, tenés "Flor". Estás obligado a cantarla. La Flor anula cualquier Envido que se haya cantado.</p>
                <ul>
                    <li><strong>Flor:</strong> Ganas 3 puntos automáticamente.</li>
                    <li>Si el oponente también tiene Flor, puede cantar <strong>"Contraflor"</strong>.</li>
                    <li>El ganador de la Contraflor se determina por quién tiene más puntos de flor (se suman los valores de las tres cartas + 20).</li>
                </ul>
                <Example title="Ejemplo de Flor">
                    <div className="flex gap-2">
                        <CardDisplay card={{rank: 4, suit: 'espadas'}} displayMode={cardDisplayMode} />
                        <CardDisplay card={{rank: 5, suit: 'espadas'}} displayMode={cardDisplayMode} />
                        <CardDisplay card={{rank: 6, suit: 'espadas'}} displayMode={cardDisplayMode} />
                    </div>
                    <p className="mt-2 text-sm">Las tres cartas son de Espadas. Tenés <strong>Flor</strong>. Tus puntos son 4 + 5 + 6 + 20 = <strong>35 puntos</strong>.</p>
                </Example>
            </Section>
            
            <Section title="El Truco: La Apuesta por la Ronda">
                <p>El Truco es una apuesta sobre quién ganará la ronda (las 3 manos). Se puede cantar en cualquier momento. El valor de la ronda aumenta a medida que se sube la apuesta.</p>
                <ul>
                    <li><strong>Truco:</strong> Si el oponente no quiere, ganas 1 punto. Si quiere, el ganador de la ronda se lleva <strong>2 puntos</strong>.</li>
                    <li><strong>Retruco:</strong> Si el oponente no quiere, ganas 2 puntos. Si quiere, el ganador de la ronda se lleva <strong>3 puntos</strong>.</li>
                    <li><strong>Vale Cuatro:</strong> Si el oponente no quiere, ganas 3 puntos. Si quiere, el ganador de la ronda se lleva <strong>4 puntos</strong>.</li>
                </ul>
                <p>El truco es el arte del engaño. ¡Podés cantar "Truco" con malas cartas (un "farol" o "bluff") para intentar que tu oponente se retire!</p>
            </Section>

            <Section title="Ejemplo de una Ronda Completa">
                <p>Veamos cómo se desarrolla una ronda paso a paso para entender cómo se suman los puntos.</p>

                <h3 className="text-xl font-cinzel mt-4">1. Inicio de la Ronda</h3>
                <p>El marcador está 0 a 0. En esta ronda, vos sos "mano" (jugás primero).</p>
                <div className="flex flex-wrap justify-around items-center bg-black/20 p-2 rounded-md">
                    <div>
                        <p className="text-center font-semibold mb-2">Tu Mano</p>
                        <div className="flex gap-2">
                            <CardDisplay card={{ rank: 7, suit: 'oros' }} displayMode={cardDisplayMode} />
                            <CardDisplay card={{ rank: 5, suit: 'bastos' }} displayMode={cardDisplayMode} />
                            <CardDisplay card={{ rank: 4, suit: 'copas' }} displayMode={cardDisplayMode} />
                        </div>
                    </div>
                    <div>
                        <p className="text-center font-semibold mb-2">Mano de la IA</p>
                        <div className="flex gap-2">
                            <CardDisplay card={{ rank: 1, suit: 'espadas' }} displayMode={cardDisplayMode} />
                            <CardDisplay card={{ rank: 2, suit: 'oros' }} displayMode={cardDisplayMode} />
                            <CardDisplay card={{ rank: 3, suit: 'copas' }} displayMode={cardDisplayMode} />
                        </div>
                    </div>
                </div>

                <h3 className="text-xl font-cinzel mt-4">2. Primera Mano</h3>
                <p>Como sos mano, empezás jugando. Una estrategia común es jugar tu carta más fuerte para intentar ganar la primera mano.</p>
                <Example title="Juego de la Primera Mano">
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Vos jugás:</strong> <div className="inline-block align-middle ml-2"><CardDisplay card={{ rank: 7, suit: 'oros' }} displayMode={cardDisplayMode} /></div>. Es una carta muy buena.</li>
                        <li><strong>La IA responde:</strong> <div className="inline-block align-middle ml-2"><CardDisplay card={{ rank: 1, suit: 'espadas' }} displayMode={cardDisplayMode} /></div>. ¡Es la carta más poderosa del juego!</li>
                        <li className="!mt-4"><strong>Resultado:</strong> La IA gana la primera mano y ahora le toca jugar primero en la segunda.</li>
                    </ul>
                </Example>

                <h3 className="text-xl font-cinzel mt-4">3. Segunda Mano y el Truco</h3>
                <p>La IA ganó la primera mano con su mejor carta. Ahora, desde una posición de poder, decide apostar por la ronda.</p>
                <Example title="La IA canta 'Truco'">
                    <ul className="list-disc list-inside">
                        <li>La IA dice: <strong>"¡Truco!"</strong>. Esto sube el valor de la ronda a 2 puntos.</li>
                        <li><strong>Tu decisión:</strong> Tus cartas restantes son el 5 de Bastos y el 4 de Copas, ambas muy débiles. Sabés que la IA ya usó su mejor carta, pero es muy probable que sus cartas restantes sean mejores que las tuyas.</li>
                        <li>Decidís decir <strong>"No Quiero"</strong>. Es una retirada estratégica para no perder más puntos.</li>
                    </ul>
                </Example>

                <h3 className="text-xl font-cinzel mt-4">4. Resultado de la Ronda</h3>
                <p>Como no aceptaste el Truco, la ronda termina inmediatamente.</p>
                <ul className="list-disc list-inside">
                    <li>La IA gana <strong>1 punto</strong> por el Truco que no quisiste.</li>
                    <li>No se jugó Envido, así que no hay puntos por tantos.</li>
                </ul>
                <div className="mt-2 p-3 bg-yellow-900/40 border border-yellow-600/30 rounded-md text-center">
                    <strong className="text-xl">Marcador Final de la Ronda: Vos 0 - IA 1</strong>
                </div>
                <p className="mt-2">En la siguiente ronda, la IA será "mano" y el juego continúa hasta que alguien llegue a 15 puntos.</p>
            </Section>

        </div>
    </div>
  );
};

export default Manual;
