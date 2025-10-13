import React, { useState } from 'react';
import Card from './Card';
import { Card as CardType, Suit } from '../types';

interface ManualProps {
  onExit: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-8 p-4 bg-black/20 rounded-lg border-2 border-yellow-800/30">
    <h2 className="text-2xl font-cinzel text-yellow-300 mb-4 border-b-2 border-yellow-800/50 pb-2">{title}</h2>
    <div className="space-y-4 text-gray-200 leading-relaxed text-base prose prose-invert max-w-none prose-p:text-gray-200 prose-ul:text-gray-300 prose-strong:text-yellow-200 prose-headings:text-yellow-300">{children}</div>
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

const CardPileDisplay: React.FC<{ cards: CardType[], label: string, displayMode: 'image' | 'local-image' | 'fallback' }> = ({ cards, label, displayMode }) => (
    <div className="inline-flex flex-col items-center text-center mx-4 my-2" style={{ width: '160px' }}>
        <div className="relative h-[150px] w-full flex items-center justify-center">
            {cards.map((card, index) => {
                const centerOffset = index - (cards.length - 1) / 2;
                const rotation = centerOffset * 16;
                const translateX = centerOffset * 12;
                const translateY = Math.abs(centerOffset) * 5;
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
    
    const hierarchyData = [
        { rank: 1, card: { rank: 1, suit: 'espadas' } as CardType, name: "As de Espadas", tip: "La carta más poderosa. Guárdala para un momento decisivo." },
        { rank: 2, card: { rank: 1, suit: 'bastos' } as CardType, name: "As de Bastos", tip: "Casi tan fuerte como el de espadas. Úsala para asegurar una mano importante." },
        { rank: 3, card: { rank: 7, suit: 'espadas' } as CardType, name: "Siete de Espadas", tip: "Extremadamente fuerte. Puede usarse para farolear haciéndola pasar por un As." },
        { rank: 4, card: { rank: 7, suit: 'oros' } as CardType, name: "Siete de Oros", tip: "La última de las 'cartas bravas'. Sigue siendo una carta de élite." },
        { rank: 5, cards: [{ rank: 3, suit: 'oros' } as CardType], name: "Los Tres", tip: "Superan a todas las cartas comunes. Una base sólida para cualquier mano." },
        { rank: 6, cards: [{ rank: 2, suit: 'bastos' } as CardType], name: "Los Dos", tip: "Fuertes y confiables, superan a la mayoría de las cartas." },
        { rank: 7, cards: [{ rank: 1, suit: 'copas' } as CardType], name: "Anchos Falsos", tip: "As de Oros y Copas. Parecen fuertes, pero son superados por los 2 y 3." },
        { rank: 8, cards: [{ rank: 12, suit: 'espadas' } as CardType], name: "Los Reyes (12)", tip: "Las figuras más altas, pero de valor medio en el truco." },
        { rank: 9, cards: [{ rank: 11, suit: 'bastos' } as CardType], name: "Los Caballos (11)", tip: "Ligeramente más débiles que los Reyes." },
        { rank: 10, cards: [{ rank: 10, suit: 'copas' } as CardType], name: "Las Sotas (10)", tip: "Las figuras más bajas." },
        { rank: 11, cards: [{ rank: 7, suit: 'bastos' } as CardType], name: "Sietes Falsos", tip: "7 de Bastos y Copas. A menudo se usan para sacrificar en la primera mano." },
        { rank: 12, cards: [{ rank: 6, suit: 'oros' } as CardType], name: "Los Seis", tip: "Cartas de valor bajo." },
        { rank: 13, cards: [{ rank: 5, suit: 'espadas' } as CardType], name: "Los Cincos", tip: "Cartas débiles, buenas para descartar." },
        { rank: 14, cards: [{ rank: 4, suit: 'copas' } as CardType], name: "Los Cuatros", tip: "Las cartas más débiles del juego." }
    ];

  return (
    <div className="h-screen bg-green-900 text-white font-lora flex flex-col items-center p-2 lg:p-4" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')" }}>
        <div className="w-full max-w-5xl flex justify-between items-center mb-4 flex-shrink-0 px-2 gap-4">
            <h1 className="text-3xl lg:text-4xl font-cinzel text-yellow-300" style={{ textShadow: '2px 2px 4px #000' }}>Manual del Truco</h1>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-yellow-200">
                    <span className="hidden sm:inline">Vistas:</span>
                    <ModeButton mode="fallback" currentMode={cardDisplayMode} setMode={setCardDisplayMode}>SVG</ModeButton>
                    <ModeButton mode="image" currentMode={cardDisplayMode} setMode={setCardDisplayMode}>Remoto</ModeButton>
                    <div className="flex items-center gap-1">
                        <ModeButton mode="local-image" currentMode={cardDisplayMode} setMode={setCardDisplayMode}>Local</ModeButton>
                        <span className="text-xs text-gray-400 hidden sm:inline cursor-help" title="Requiere que el archivo 'cartas.png' esté en la carpeta /public/ o /assets/.">(?)</span>
                    </div>
                </div>
                <button onClick={onExit} className="px-4 py-2 text-sm rounded-md border-2 bg-red-700/80 border-red-500 text-white transition-colors hover:bg-red-600/90 flex-shrink-0">Volver al Menú</button>
            </div>
        </div>
        <div className="w-full max-w-5xl overflow-y-auto flex-grow p-2 lg:p-4 bg-black/40 rounded-lg border-2 border-yellow-900/50">
            <Section title="Introducción y Objetivo">
                <p>¡Bienvenido al Truco, el juego de cartas más emblemático de Argentina! Es un juego que combina estrategia, psicología y, sobre todo, el arte del engaño. El objetivo es simple: ser el primer jugador o equipo en llegar a <strong>15 puntos</strong>.</p>
                <p>Los puntos se ganan a través de dos tipos de apuestas: el <strong>Envido</strong> (apostar por el valor de tus cartas) y el <strong>Truco</strong> (apostar por quién ganará las manos). Dominar ambos es la clave para la victoria.</p>
            </Section>

            <Section title="Fundamentos de las Cartas y Jerarquía">
                <p>Esta es la parte más crucial para un principiante. En el Truco, el valor de las cartas no sigue el orden numérico. Olvida lo que sabes de otros juegos; aquí, un 3 vale más que un Rey. Los palos (oros, copas, espadas, bastos) no importan para la fuerza de una carta, solo para el Envido.</p>
                <p>Estudia bien esta tabla. Proyectarla o tenerla a mano durante tus primeras partidas es fundamental.</p>
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left text-sm lg:text-base border-collapse">
                        <thead className="bg-black/40 text-amber-100">
                            <tr>
                                <th className="border border-yellow-800/50 p-2">Rango</th>
                                <th className="border border-yellow-800/50 p-2">Carta(s)</th>
                                <th className="border border-yellow-800/50 p-2">Consejo de Juego</th>
                            </tr>
                        </thead>
                        <tbody className="bg-black/20">
                            {hierarchyData.map(({ rank, card, cards, name, tip }) => (
                                <tr key={rank} className="border-b border-yellow-800/50">
                                    <td className="border border-yellow-800/50 p-2 font-bold text-center">{rank}</td>
                                    <td className="border border-yellow-800/50 p-2">
                                        <div className="flex items-center gap-2">
                                            {card ? <CardDisplay card={card} displayMode={cardDisplayMode}/> : cards ? <CardDisplay card={cards[0]} displayMode={cardDisplayMode}/> : null}
                                            <strong>{name}</strong>
                                        </div>
                                    </td>
                                    <td className="border border-yellow-800/50 p-2 italic text-gray-300">{tip}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>
            
            <Section title="Las Fases del Juego: Flor, Envido y Truco">
                <p>Una ronda tiene un orden estricto de apuestas. Siempre se resuelve en este orden: <strong>1. Flor</strong>, <strong>2. Envido</strong>, <strong>3. Truco</strong>. Esto significa que si un jugador canta "Truco", el otro todavía puede interrumpir con "Envido" (una jugada llamada "envido primero").</p>
                
                <h3 className="text-xl font-cinzel mt-6">1. La Flor (Bonus Raro)</h3>
                <p>Si recibís tres cartas del mismo palo, tenés "Flor". Estás <strong>obligado a cantarla</strong> al inicio de tu turno en la primera mano. Ganas 3 puntos automáticamente y el Envido de esa ronda queda anulado.</p>
                <Example title="Ejemplo de Flor (35 puntos)">
                     <div className="flex gap-2">
                        {/* Fix: Explicitly cast card object literals to CardType to resolve TypeScript inference issue. */}
                        <CardDisplay card={{rank: 4, suit: 'espadas'} as CardType} displayMode={cardDisplayMode} />
                        <CardDisplay card={{rank: 5, suit: 'espadas'} as CardType} displayMode={cardDisplayMode} />
                        <CardDisplay card={{rank: 6, suit: 'espadas'} as CardType} displayMode={cardDisplayMode} />
                    </div>
                    <p className="mt-2 text-sm">Cálculo: 4 + 5 + 6 + 20 = <strong>35 puntos de Flor</strong>.</p>
                </Example>
                
                <h3 className="text-xl font-cinzel mt-6">2. El Envido (Apuestas de Mano)</h3>
                <p>El Envido solo se puede cantar en la primera mano. Es una apuesta para ver quién tiene la puntuación más alta. Las figuras (10, 11, 12) valen 0 puntos para el Envido.</p>
                <ul>
                    <li><strong>Dos cartas del mismo palo:</strong> Sumás sus valores y agregás 20.</li>
                    <li><strong>Tres cartas de palos diferentes:</strong> Tu puntuación es el valor de tu carta más alta.</li>
                </ul>
                <div className="space-y-3">
                    <Example title="Ejemplo de Envido (31 puntos)">
                        <div className="flex gap-2">
                            {/* Fix: Explicitly cast card object literals to CardType to resolve TypeScript inference issue. */}
                            <CardDisplay card={{rank: 5, suit: 'oros'} as CardType} displayMode={cardDisplayMode} />
                            <CardDisplay card={{rank: 6, suit: 'oros'} as CardType} displayMode={cardDisplayMode} />
                            <CardDisplay card={{rank: 1, suit: 'espadas'} as CardType} displayMode={cardDisplayMode} />
                        </div>
                        <p className="mt-2 text-sm">Cálculo: 20 (por tener dos de Oros) + 5 + 6 = <strong>31 puntos</strong>.</p>
                    </Example>
                </div>

                <h3 className="text-xl font-cinzel mt-6">3. El Truco (Apuestas de Ronda)</h3>
                <p>El Truco es la apuesta sobre quién ganará más "trucos" o manos (el mejor de 3). Se puede cantar en cualquier momento y tiene su propia escalera de apuestas:</p>
                <ul>
                    <li><strong>Truco:</strong> La apuesta inicial. Si se acepta, la ronda vale 2 puntos. Si se rechaza, el que cantó gana 1 punto.</li>
                    <li><strong>Retruco:</strong> Sube la apuesta a 3 puntos.</li>
                    <li><strong>Vale Cuatro:</strong> La apuesta final, sube el valor a 4 puntos.</li>
                </ul>
            </Section>

            <Section title="Juego Completo y Puntuación">
                <p>Una vez resueltas las apuestas de Flor y Envido, se procede a jugar las tres manos. El jugador que gana 2 de 3 manos gana la ronda y los puntos del Truco que se hayan apostado.</p>
                
                <h3 className="text-xl font-cinzel mt-4">Casos de Empate (Parda)</h3>
                <ul>
                    <li><strong>Parda en la 1ra mano:</strong> El ganador de la 2da mano gana la ronda. Si la 2da también es parda, el ganador de la 3ra decide.</li>
                    <li><strong>Parda en la 2da o 3ra mano (y nadie ganó 2):</strong> Gana el jugador que haya ganado la mano anterior.</li>
                    <li><strong>Todas las manos en parda:</strong> Gana el jugador que era "mano" al inicio de la ronda.</li>
                </ul>
                
                <h3 className="text-xl font-cinzel mt-4">Tabla de Puntuación de Ejemplo</h3>
                <table className="w-full text-left text-sm border-collapse mt-2">
                    <thead className="bg-black/40 text-amber-100">
                        <tr>
                            <th className="border border-yellow-800/50 p-2">Escenario</th>
                            <th className="border border-yellow-800/50 p-2">Puntos Otorgados</th>
                            <th className="border border-yellow-800/50 p-2">Clave de Enseñanza</th>
                        </tr>
                    </thead>
                    <tbody className="bg-black/20">
                        <tr><td className="border p-2">Ganar 2 trucos, sin apuestas</td><td className="border p-2">+1 punto</td><td className="border p-2 italic">La paciencia tiene su recompensa.</td></tr>
                        <tr><td className="border p-2">Ganar un Envido (2pts) y un Retruco (3pts)</td><td className="border p-2">+5 puntos</td><td className="border p-2 italic">Las apuestas amplifican las ganancias. ¡Arriesga con inteligencia!</td></tr>
                        <tr><td className="border p-2">Cantar Flor y que el oponente no tenga</td><td className="border p-2">+3 puntos</td><td className="border p-2 italic">Un golpe de suerte raro. ¡Aprovéchalo!</td></tr>
                        <tr><td className="border p-2">Cantar Falta Envido y que el oponente se retire (faltando 7 pts)</td><td className="border p-2">+7 puntos</td><td className="border p-2 italic">Un farol de altas apuestas puede decidir el juego.</td></tr>
                    </tbody>
                </table>
            </Section>

            <Section title="Estrategia, Errores Comunes y Reflexiones">
                <p>El Truco es un juego social. Aunque aquí juegues contra una IA, los principios del engaño y la lectura del oponente son los mismos.</p>
                
                 <table className="w-full text-left text-sm border-collapse mt-2">
                    <thead className="bg-black/40 text-amber-100">
                        <tr>
                            <th className="border border-yellow-800/50 p-2">Error Común</th>
                            <th className="border border-yellow-800/50 p-2">Por qué Sucede</th>
                            <th className="border border-yellow-800/50 p-2">Cómo Evitarlo</th>
                        </tr>
                    </thead>
                    <tbody className="bg-black/20">
                        <tr>
                            <td className="border p-2"><strong>Confundir la jerarquía</strong> (pensar que un Rey es más que un 3)</td>
                            <td className="border p-2">La jerarquía no es intuitiva.</td>
                            <td className="border p-2">Repasa la tabla de jerarquía constantemente hasta que la memorices. No hay atajos.</td>
                        </tr>
                         <tr>
                            <td className="border p-2"><strong>Cantar "Envido" tarde</strong></td>
                            <td className="border p-2">Olvidar que solo se puede en la 1ra mano.</td>
                            <td className="border p-2">Crea el hábito: al recibir tus cartas, lo primero que debes hacer es calcular tu Envido.</td>
                        </tr>
                        <tr>
                            <td className="border p-2"><strong>No retirarse a tiempo ("ir al muere")</strong></td>
                            <td className="border p-2">Exceso de confianza o no querer "perder".</td>
                            <td className="border p-2">Aprende a reconocer una mano perdedora. Retirarse y perder 1 punto es mejor que aceptar y perder 2 o más.</td>
                        </tr>
                        <tr>
                            <td className="border p-2"><strong>Ser demasiado predecible</strong></td>
                            <td className="border p-2">Cantar Truco solo con cartas buenas.</td>
                            <td className="border p-2">¡Atrévete a farolear! Canta Truco de vez en cuando con una mano mediocre para mantener a tu oponente adivinando.</td>
                        </tr>
                    </tbody>
                </table>
            </Section>
        </div>
    </div>
  );
};

export default Manual;