import React from 'react';
import { Card, Action } from '../types';
import { getCardHierarchy, getCardName } from './trucoLogic';
import CardComponent from '../components/Card';

const HierarchyDisplay: React.FC<{ card: Card }> = ({ card }) => {
    // A representative sample of cards for hierarchy display, not the full deck
    const allCards: Card[] = [
        { rank: 1, suit: 'espadas' }, { rank: 1, suit: 'bastos' },
        { rank: 7, suit: 'espadas' }, { rank: 7, suit: 'oros' },
        { rank: 3, suit: 'bastos' }, { rank: 2, suit: 'bastos' },
        { rank: 1, suit: 'oros' }, { rank: 12, suit: 'bastos' },
    ];
    
    const cardValue = getCardHierarchy(card);
    const strongerCards = allCards.filter(c => getCardHierarchy(c) > cardValue);

    return React.createElement(
        'div',
        null,
        React.createElement(
            'p',
            { className: "text-sm mb-2 text-yellow-200" },
            `Hay solo ${strongerCards.length} cartas más poderosas que tu ${getCardName(card)}:`
        ),
        React.createElement(
            'div',
            { className: "flex gap-2 justify-center flex-wrap" },
            strongerCards.map(c => React.createElement(CardComponent, { key: `${c.rank}-${c.suit}`, card: c, size: "small" }))
        )
    );
};


export interface TutorialStep {
  title: string;
  tutorMessage: string;
  playerHand: Card[];
  aiHand: Card[];
  playerTricks?: (Card | null)[];
  aiTricks?: (Card | null)[];
  trickWinners?: ('player' | 'ai' | 'tie' | null)[];
  currentTrick?: number;
  highlightedAction?: 'envido' | 'truco' | 'play_card';
  validateAction?: (action: Action) => boolean;
  nextStepOnSuccess?: boolean;
  extraContent?: React.ReactNode;
}

const hand_hierarchy: Card[] = [{rank: 7, suit: 'oros'}, {rank: 5, suit: 'copas'}, {rank: 11, suit: 'bastos'}];
const hand_envido: Card[] = [{rank: 11, suit: 'oros'}, {rank: 5, suit: 'oros'}, {rank: 4, suit: 'copas'}];
const hand_truco: Card[] = [{rank: 1, suit: 'espadas'}, {rank: 7, suit: 'espadas'}, {rank: 4, suit: 'copas'}];

export const tutorialScenarios: TutorialStep[] = [
    {
        title: "Paso 1: El Poder de las Cartas",
        tutorMessage: "Cada carta tiene un valor. El 'Ancho de Espadas' es la más fuerte. Aquí tenés un 'Siete de Oros', una carta muy poderosa.",
        playerHand: hand_hierarchy,
        aiHand: [{rank: 4, suit: 'bastos'}, {rank: 5, suit: 'oros'}, {rank: 6, suit: 'espadas'}],
        extraContent: React.createElement(HierarchyDisplay, { card: hand_hierarchy[0] }),
    },
    {
        title: "Paso 2: El Envido",
        tutorMessage: "Cuando tenés dos cartas del mismo palo, podés cantar 'Envido'. Se suman sus valores y se le agregan 20. Las figuras (10, 11, 12) valen 0. Fijate, el 5 de Oros vale 5 y el Caballo de Oros vale 0, ¡así que tenés 25 de envido! ¡Cantalo!",
        playerHand: hand_envido,
        aiHand: [{rank: 4, suit: 'bastos'}, {rank: 3, suit: 'oros'}, {rank: 10, suit: 'espadas'}],
        highlightedAction: 'envido',
        validateAction: (action) => action.type === 'CALL_ENVIDO' || action.type === 'CALL_REAL_ENVIDO' || action.type === 'CALL_FALTA_ENVIDO',
        nextStepOnSuccess: true,
    },
    {
        title: "Paso 3: El Truco",
        tutorMessage: "¡Wow, qué mano! Tenés el 'Ancho de Espadas' y el 'Siete de Espadas', dos de las cartas más poderosas. Es un momento perfecto para cantar 'Truco' desde el inicio y apostar más fuerte.",
        playerHand: hand_truco,
        aiHand: [{rank: 4, suit: 'bastos'}, {rank: 5, suit: 'oros'}, {rank: 6, suit: 'espadas'}],
        highlightedAction: 'truco',
        validateAction: (action) => action.type === 'CALL_TRUCO',
        nextStepOnSuccess: true,
    },
    {
        title: "¡A Jugar!",
        tutorMessage: "¡Eso es lo básico! Aprendiste sobre el valor de las cartas, el Envido y el Truco. Ahora estás listo para desafiar a la IA. ¡Buena suerte!",
        playerHand: [],
        aiHand: [],
    }
];