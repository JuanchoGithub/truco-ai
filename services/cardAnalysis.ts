import { Card, CardCategory, PlayerCardPlayStatistics, CardPlayStats } from '../types';

export function getCardCategory(card: Card): CardCategory | null {
  if (card.rank === 1 && card.suit === 'espadas') return 'ancho_espada';
  if (card.rank === 1 && card.suit === 'bastos') return 'ancho_basto';
  if (card.rank === 7 && card.suit === 'espadas') return 'siete_espada';
  if (card.rank === 7 && card.suit === 'oros') return 'siete_oro';
  if (card.rank === 3) return 'tres';
  if (card.rank === 2) return 'dos';
  if (card.rank === 1) return 'anchos_falsos';
  if (card.rank === 12) return 'reyes';
  if (card.rank === 11) return 'caballos';
  if (card.rank === 10) return 'sotas';
  if (card.rank === 7) return 'sietes_malos';
  if (card.rank === 6) return 'seis';
  if (card.rank === 5) return 'cincos';
  if (card.rank === 4) return 'cuatros';
  return null;
}

const createEmptyStats = (): CardPlayStats => ({
  plays: 0,
  wins: 0,
  byTrick: [0, 0, 0],
  asLead: 0,
  asResponse: 0,
});

export function createInitialCardPlayStats(): PlayerCardPlayStatistics {
  return {
    ancho_espada: createEmptyStats(),
    ancho_basto: createEmptyStats(),
    siete_espada: createEmptyStats(),
    siete_oro: createEmptyStats(),
    tres: createEmptyStats(),
    dos: createEmptyStats(),
    anchos_falsos: createEmptyStats(),
    reyes: createEmptyStats(),
    caballos: createEmptyStats(),
    sotas: createEmptyStats(),
    sietes_malos: createEmptyStats(),
    seis: createEmptyStats(),
    cincos: createEmptyStats(),
    cuatros: createEmptyStats(),
  };
}
