import React from 'react';
import { Card, Action, ActionType, GameState } from '../types';
import { getCardHierarchy } from './trucoLogic';

export interface TutorialStep {
  titleKey: string;
  tutorMessageKey: string;
  type: 'intro' | 'hierarchy_intro' | 'hierarchy_quiz' | 'envido_intro' | 'envido_practice' | 'truco_intro' | 'truco_practice' | 'conclusion';
  // State setup
  playerHand?: Card[];
  aiHand?: Card[];
  // For quizzes
  quizOptions?: {
    cards: [Card, Card];
    correct: 0 | 1; // index of the correct card
  };
  // For practice
  highlightedAction?: ActionType;
  validateAction?: (action: Action) => boolean;
  successMessageKey?: string;
  isFinalStep?: boolean;
}

export const tutorialSteps: TutorialStep[] = [
  {
    type: 'intro',
    titleKey: 'tutorial.step0.title',
    tutorMessageKey: 'tutorial.step0.message',
    playerHand: [],
    aiHand: [],
  },
  {
    type: 'hierarchy_intro',
    titleKey: 'tutorial.step1.title',
    tutorMessageKey: 'tutorial.step1.message',
    playerHand: [],
    aiHand: [],
  },
  {
    type: 'hierarchy_quiz',
    titleKey: 'tutorial.step2.title',
    tutorMessageKey: 'tutorial.step2.message',
    quizOptions: {
      cards: [
        { rank: 7, suit: 'espadas' },
        { rank: 7, suit: 'oros' },
      ],
      correct: 0,
    },
    successMessageKey: 'tutorial.step2.success',
  },
  {
    type: 'hierarchy_quiz',
    titleKey: 'tutorial.step3.title',
    tutorMessageKey: 'tutorial.step3.message',
    quizOptions: {
      cards: [
        { rank: 2, suit: 'bastos' },
        { rank: 3, suit: 'copas' },
      ],
      correct: 1,
    },
    successMessageKey: 'tutorial.step3.success',
  },
  {
    type: 'hierarchy_quiz',
    titleKey: 'tutorial.step4.title',
    tutorMessageKey: 'tutorial.step4.message',
    quizOptions: {
      cards: [
        { rank: 1, suit: 'oros' }, // Ancho falso (value 8)
        { rank: 2, suit: 'espadas' }, // Dos (value 9)
      ],
      correct: 1,
    },
    successMessageKey: 'tutorial.step4.success',
  },
  {
    type: 'envido_intro',
    titleKey: 'tutorial.step5.title',
    tutorMessageKey: 'tutorial.step5.message',
    playerHand: [
        { rank: 5, suit: 'oros' },
        { rank: 6, suit: 'oros' },
        { rank: 2, suit: 'bastos' },
    ],
    aiHand: [
        { rank: 4, suit: 'copas' },
        { rank: 1, suit: 'espadas' },
        { rank: 11, suit: 'bastos' },
    ],
  },
  {
    type: 'envido_practice',
    titleKey: 'tutorial.step6.title',
    tutorMessageKey: 'tutorial.step6.message',
    playerHand: [
        { rank: 7, suit: 'espadas' },
        { rank: 6, suit: 'espadas' },
        { rank: 4, suit: 'copas' },
    ],
    aiHand: [
        { rank: 1, suit: 'bastos' },
        { rank: 2, suit: 'oros' },
        { rank: 5, suit: 'copas' },
    ],
    highlightedAction: ActionType.CALL_ENVIDO,
    validateAction: (action) => action.type === ActionType.CALL_ENVIDO || action.type === ActionType.CALL_REAL_ENVIDO,
    successMessageKey: 'tutorial.step6.success',
  },
  {
    type: 'truco_intro',
    titleKey: 'tutorial.step7.title',
    tutorMessageKey: 'tutorial.step7.message',
    playerHand: [],
    aiHand: [],
  },
  {
    type: 'truco_practice',
    titleKey: 'tutorial.step8.title',
    tutorMessageKey: 'tutorial.step8.message',
    playerHand: [
        { rank: 1, suit: 'espadas' },
        { rank: 1, suit: 'bastos' },
        { rank: 5, suit: 'oros' },
    ],
    aiHand: [
        { rank: 7, suit: 'oros' },
        { rank: 2, suit: 'copas' },
        { rank: 4, suit: 'bastos' },
    ],
    highlightedAction: ActionType.CALL_TRUCO,
    validateAction: (action) => action.type === ActionType.CALL_TRUCO,
    successMessageKey: 'tutorial.step8.success',
  },
  {
    type: 'conclusion',
    titleKey: 'tutorial.step9.title',
    tutorMessageKey: 'tutorial.step9.message',
    playerHand: [],
    aiHand: [],
    isFinalStep: true,
  },
];