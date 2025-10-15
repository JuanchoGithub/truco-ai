import React, { useState } from 'react';
import { loadStateFromStorage } from '../services/storageService';
import ContinueGameModal from './ContinueGameModal';
import { useLocalization } from '../context/LocalizationContext';

interface MainMenuProps {
  onStartGame: (mode: 'playing' | 'playing-with-help', continueGame: boolean) => void;
  onLearn: () => void;
  onManual: () => void;
  onSimulate: () => void;
}

const ARFlag = () => (
    <svg width="40" height="30" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm shadow-md">
        <path d="M0 0H32V24H0V0Z" fill="#75AADB"/>
        <path d="M0 8H32V16H0V8Z" fill="white"/>
        <path d="M16 9.5C17.3807 9.5 18.5 10.6193 18.5 12C18.5 13.3807 17.3807 14.5 16 14.5C14.6193 14.5 13.5 13.3807 13.5 12C13.5 10.6193 14.6193 9.5 16 9.5Z" fill="#F9B423" stroke="#845421" strokeWidth="0.5"/>
    </svg>
);

const USFlag = () => (
    <svg width="40" height="30" viewBox="0 0 72 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm shadow-md">
        <path d="M0 0H72V48H0V0Z" fill="#B22234"/>
        <path d="M0 8H72V16H0V8Z" fill="white"/>
        <path d="M0 24H72V32H0V24Z" fill="white"/>
        <path d="M0 40H72V48H0V40Z" fill="white"/>
        <path d="M0 0H32V24H0V0Z" fill="#3C3B6E"/>
    </svg>
);


const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onLearn, onManual, onSimulate }) => {
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    mode: 'playing' | 'playing-with-help' | null;
  }>({ isOpen: false, mode: null });
  const { t, setLanguage, language } = useLocalization();

  const handlePlayClick = (mode: 'playing' | 'playing-with-help') => {
    const savedState = loadStateFromStorage(mode);
    // Check if there's a game in progress (round > 0 and no winner).
    if (savedState && savedState.round && savedState.round > 0 && !savedState.winner) {
      setConfirmModal({ isOpen: true, mode });
    } else {
      onStartGame(mode, false);
    }
  };

  const handleContinue = () => {
    if (confirmModal.mode) {
      onStartGame(confirmModal.mode, true);
      setConfirmModal({ isOpen: false, mode: null });
    }
  };

  const handleNewGame = () => {
    if (confirmModal.mode) {
      onStartGame(confirmModal.mode, false);
      setConfirmModal({ isOpen: false, mode: null });
    }
  };

  return (
    <div className="h-screen bg-green-900 text-white font-sans flex items-center justify-center" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
      <div className="relative text-center p-8 bg-black/40 border-4 border-yellow-800/60 rounded-xl shadow-2xl animate-fade-in-scale">
        <div className="absolute top-4 right-4 flex gap-3">
            <button onClick={() => setLanguage('es-AR')} className={`transition-opacity duration-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-yellow-400 ${language === 'es-AR' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`} aria-label="Cambiar a Español">
                <ARFlag />
            </button>
            <button onClick={() => setLanguage('en-US')} className={`transition-opacity duration-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-yellow-400 ${language === 'en-US' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`} aria-label="Change to English">
                <USFlag />
            </button>
        </div>
        <h1 className="text-6xl lg:text-8xl font-cinzel font-bold tracking-wider text-yellow-300 mb-2" style={{ textShadow: '4px 4px 6px rgba(0,0,0,0.8)' }}>
          {t('mainMenu.title')}
        </h1>
        <p className="text-gray-300 mb-12">{t('mainMenu.subtitle')}</p>
        <div className="flex flex-col gap-6">
          <button
            onClick={() => handlePlayClick('playing')}
            className="px-8 py-4 text-xl lg:text-2xl rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 border-b-4 bg-gradient-to-b from-yellow-600 to-yellow-700 border-yellow-900 hover:from-yellow-500 hover:to-yellow-600"
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
          >
            {t('mainMenu.play_normal')}
          </button>
          <button
            onClick={() => handlePlayClick('playing-with-help')}
            className="px-8 py-4 text-xl lg:text-2xl rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 border-b-4 bg-gradient-to-b from-green-600 to-green-700 border-green-900 hover:from-green-500 hover:to-green-600"
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
          >
            {t('mainMenu.play_with_help')}
          </button>
          <button
            onClick={onLearn}
            className="px-8 py-4 text-xl lg:text-2xl rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 border-b-4 bg-gradient-to-b from-blue-600 to-blue-700 border-blue-900 hover:from-blue-500 hover:to-blue-600"
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
          >
            {t('mainMenu.learn')}
          </button>
           <button
            onClick={onManual}
            className="px-8 py-4 text-xl lg:text-2xl rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 border-b-4 bg-gradient-to-b from-slate-600 to-slate-700 border-slate-900 hover:from-slate-500 hover:to-slate-600"
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
          >
            {t('mainMenu.manual')}
          </button>
           <button
            onClick={onSimulate}
            className="px-8 py-3 text-lg rounded-lg font-bold text-cyan-200 shadow-lg transition-transform transform hover:scale-105 border-b-4 bg-gradient-to-b from-gray-700 to-gray-800 border-gray-900 hover:from-gray-600 hover:to-gray-700 mt-4"
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
          >
            {t('mainMenu.simulate')}
          </button>
        </div>
      </div>
      {confirmModal.isOpen && (
        <ContinueGameModal
          onContinue={handleContinue}
          onNewGame={handleNewGame}
          onCancel={() => setConfirmModal({ isOpen: false, mode: null })}
        />
      )}
    </div>
  );
};

export default MainMenu;
