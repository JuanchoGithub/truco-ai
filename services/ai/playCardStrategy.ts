
import { GameState, Card, Suit } from '../../types';
import { getCardHierarchy, getCardName, getEnvidoValue } from '../trucoLogic';

export interface PlayCardResult {
    index: number;
    reasoning: string[];
}

const findCardIndexByValue = (hand: Card[], type: 'min' | 'max'): number => {
    if (hand.length === 0) return -1;
    const sortedHand = [...hand].sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
    const cardToFind = type === 'min' ? sortedHand[0] : sortedHand[sortedHand.length - 1];
    return hand.findIndex(c => c.rank === cardToFind.rank && c.suit === cardToFind.suit);
}

// Helper to find the suit that forms the basis of the Envido points.
const getEnvidoSuit = (hand: Card[]): Suit | null => {
  if (hand.length < 2) return null;
  const suitCounts: Partial<Record<Suit, number>> = {};
  hand.forEach(card => {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  });
  // Explicitly check in order of suits to be deterministic if there are multiple pairs (not possible with 3 cards)
  for (const suit of (['espadas', 'bastos', 'oros', 'copas'] as Suit[])) {
    if (suitCounts[suit]! >= 2) {
      return suit;
    }
  }
  return null;
};

export const findBestCardToPlay = (state: GameState): PlayCardResult => {
    const { aiHand, playerTricks, currentTrick, trickWinners, mano, hasEnvidoBeenCalledThisRound, initialAiHand, playerEnvidoValue } = state;
    if (aiHand.length === 0) return { index: 0, reasoning: ["No quedan cartas para jugar."]};

    let reasoning: string[] = [`[Lógica: Jugar Carta]`, `Mi mano: ${aiHand.map(getCardName).join(', ')}`];
    const playerCardOnBoard = playerTricks[currentTrick];

    // --- AI is leading the trick ---
    if (!playerCardOnBoard) {
        reasoning.push(`Lidero la Mano ${currentTrick + 1}.`);

        // Advanced Deceptive Play
        // Condition: AI won a high-value envido showdown, so player knows AI has good envido cards.
        if (currentTrick === 0 && mano === 'ai' && playerEnvidoValue !== null) {
            const myEnvido = getEnvidoValue(initialAiHand);
            if (myEnvido > playerEnvidoValue && myEnvido >= 28 && Math.random() < 0.6) { // 60% chance for deception
                const cardIndex = findCardIndexByValue(aiHand, 'min');
                reasoning.push(`[Jugada Engañosa]: Gané el Envido, por lo que el jugador sabe que tengo cartas altas. Jugaré mi carta *más baja* para fingir debilidad y provocar un Truco.`);
                reasoning.push(`\nDecisión: Jugando ${getCardName(aiHand[cardIndex])}.`);
                return { index: cardIndex, reasoning };
            }
        }


        let cardIndex = 0;
        switch (currentTrick) {
            case 0: // First trick
                if (mano === 'ai') {
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(`\nDecisión: Soy mano, así que jugaré mi carta más alta para asegurar la ventaja: ${getCardName(aiHand[cardIndex])}.`);
                } else {
                    cardIndex = findCardIndexByValue(aiHand, 'min');
                    reasoning.push(`\nDecisión: El jugador es mano, así que jugaré mi carta más baja para ver qué tiene: ${getCardName(aiHand[cardIndex])}.`);
                }
                return { index: cardIndex, reasoning };
            case 1: // Second trick
                if (trickWinners[0] === 'ai') {
                    // NEW: Deceptive "Suit-Led Misdirection" play.
                    const envidoSuit = getEnvidoSuit(initialAiHand);
                    const myEnvido = getEnvidoValue(initialAiHand);
                    
                    // Condition: AI won trick 1, has a strong envido pair that was likely revealed, and still has a card of that suit.
                    if (envidoSuit && myEnvido >= 27 && hasEnvidoBeenCalledThisRound) {
                        const matchingSuitCardIndex = aiHand.findIndex(c => c.suit === envidoSuit);
                        
                        if (matchingSuitCardIndex !== -1) {
                            // High probability to make this smart, deceptive play.
                            if (Math.random() < 0.75) {
                                reasoning.push(`[Jugada Engañosa]: Mi canto de Envido probablemente reveló mi par de '${envidoSuit}'. En lugar de mi carta más fuerte, lideraré con mi carta restante de '${envidoSuit}'.`);
                                reasoning.push(`Esto crea incertidumbre, haciendo que el oponente dude si tengo otra carta alta del mismo palo. Camufla la verdadera fuerza restante de mi mano.`);
                                const cardToPlay = aiHand[matchingSuitCardIndex];
                                reasoning.push(`\nDecisión: Jugando la engañosa ${getCardName(cardToPlay)}.`);
                                return { index: matchingSuitCardIndex, reasoning };
                            } else {
                                reasoning.push(`[Jugada Engañosa Omitida]: Consideré una jugada engañosa, pero el azar me llevó a una jugada estándar para mantenerme impredecible.`);
                            }
                        }
                    }

                    // Fallback to original logic if deceptive play isn't triggered.
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(`\nDecisión: Gané la primera mano. Jugando mi carta más alta para ganar la ronda: ${getCardName(aiHand[cardIndex])}.`);
                } else if (trickWinners[0] === 'player') {
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(`\nDecisión: Perdí la primera mano. Debo ganar esta. Jugando mi carta más alta: ${getCardName(aiHand[cardIndex])}.`);
                } else { // Tied first trick
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(`\nDecisión: La primera mano fue parda. Esto hace que la segunda sea decisiva. Debo cambiar a una estrategia agresiva y jugar mi carta más fuerte para asegurar la victoria: ${getCardName(aiHand[cardIndex])}.`);
                }
                return { index: cardIndex, reasoning };
            case 2: // Third trick
                reasoning.push(`\nDecisión: Solo queda una carta. Jugando ${getCardName(aiHand[0])}.`);
                return { index: 0, reasoning };
        }
    }

    // --- AI is responding to a card ---
    const playerCard = playerTricks[currentTrick]!;
    const playerCardValue = getCardHierarchy(playerCard);
    reasoning.push(`Respondo a la carta del jugador ${getCardName(playerCard)} (Valor: ${playerCardValue}).`);
    
    const winningCards = aiHand.filter(card => getCardHierarchy(card) > playerCardValue);
    if (winningCards.length > 0) {
        winningCards.sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
        const cardToPlay = winningCards[0];
        const cardIndex = aiHand.findIndex(c => c.rank === cardToPlay.rank && c.suit === cardToPlay.suit);
        reasoning.push(`\nDecisión: Puedo ganar esta mano. Usaré mi carta ganadora más baja para guardar las mejores: ${getCardName(cardToPlay)} (Valor: ${getCardHierarchy(cardToPlay)}).`);
        return { index: cardIndex, reasoning };
    } 
    
    const cardIndex = findCardIndexByValue(aiHand, 'min');
    reasoning.push(`\nDecisión: No puedo ganar esta mano. Descartaré mi carta más baja: ${getCardName(aiHand[cardIndex])}.`);
    return { index: cardIndex, reasoning };
}
