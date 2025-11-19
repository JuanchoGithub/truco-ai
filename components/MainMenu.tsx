
import React, { useState } from 'react';
import { loadStateFromStorage } from '../services/storageService';
import ContinueGameModal from './ContinueGameModal';
import { useLocalization } from '../context/LocalizationContext';
import SettingsModal from './SettingsModal';

interface MainMenuProps {
  onStartGame: (mode: 'playing' | 'playing-with-help', continueGame: boolean, options: { isFlorEnabled: boolean }) => void;
  onLearn: () => void;
  onManual: () => void;
  onSimulate: () => void;
}

const ARFlag = () => (
    <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm shadow-sm">
        <path d="M0 0H32V24H0V0Z" fill="#75AADB"/>
        <path d="M0 8H32V16H0V8Z" fill="white"/>
        <path d="M16 9.5C17.3807 9.5 18.5 10.6193 18.5 12C18.5 13.3807 17.3807 14.5 16 14.5C14.6193 14.5 13.5 13.3807 13.5 12C13.5 10.6193 14.6193 9.5 16 9.5Z" fill="#F9B423" stroke="#845421" strokeWidth="0.5"/>
    </svg>
);

const USFlag = () => (
    <svg width="32" height="24" viewBox="0 0 72 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm shadow-sm">
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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOpponentSoundEnabled, setIsOpponentSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('trucoAiOpponentSoundEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [isAssistantSoundEnabled, setIsAssistantSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('trucoAiAssistantSoundEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [opponentVoiceURI, setOpponentVoiceURI] = useState(() => localStorage.getItem('trucoAiOpponentVoiceURI') || 'auto');
  const [assistantVoiceURI, setAssistantVoiceURI] = useState(() => localStorage.getItem('trucoAiAssistantVoiceURI') || 'auto');
  const [isFlorEnabled, setIsFlorEnabled] = useState(() => {
    const saved = localStorage.getItem('trucoAiFlorEnabled');
    return saved !== null ? JSON.parse(saved) : true; // default to true
  });

  const handleToggleOpponentSound = () => {
    setIsOpponentSoundEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('trucoAiOpponentSoundEnabled', JSON.stringify(newValue));
      return newValue;
    });
  };

  const handleToggleAssistantSound = () => {
    setIsAssistantSoundEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('trucoAiAssistantSoundEnabled', JSON.stringify(newValue));
      return newValue;
    });
  };

  const handleOpponentVoiceChange = (uri: string) => {
    setOpponentVoiceURI(uri);
    localStorage.setItem('trucoAiOpponentVoiceURI', uri);
  };
  const handleAssistantVoiceChange = (uri: string) => {
    setAssistantVoiceURI(uri);
    localStorage.setItem('trucoAiAssistantVoiceURI', uri);
  };
  
  const handleToggleFlor = () => {
    setIsFlorEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('trucoAiFlorEnabled', JSON.stringify(newValue));
      return newValue;
    });
  };

  const handlePlayClick = (mode: 'playing' | 'playing-with-help') => {
    const savedState = loadStateFromStorage(mode);
    // Check if there's a game in progress (round > 0 and no winner).
    if (savedState && savedState.round && savedState.round > 0 && !savedState.winner) {
      setConfirmModal({ isOpen: true, mode });
    } else {
      onStartGame(mode, false, { isFlorEnabled });
    }
  };

  const handleContinue = () => {
    if (confirmModal.mode) {
      onStartGame(confirmModal.mode, true, { isFlorEnabled });
      setConfirmModal({ isOpen: false, mode: null });
    }
  };

  const handleNewGame = () => {
    if (confirmModal.mode) {
      onStartGame(confirmModal.mode, false, { isFlorEnabled });
      setConfirmModal({ isOpen: false, mode: null });
    }
  };
  
  const MenuButton: React.FC<{ onClick: () => void; children: React.ReactNode; variant?: 'primary' | 'secondary' | 'tertiary' }> = ({ onClick, children, variant = 'primary' }) => {
      let bgClasses = "bg-gradient-to-b from-yellow-600 to-yellow-700 border-yellow-900 hover:from-yellow-500 hover:to-yellow-600 text-white";
      if (variant === 'secondary') bgClasses = "bg-gradient-to-b from-stone-700 to-stone-800 border-stone-950 hover:from-stone-600 hover:to-stone-700 text-stone-100";
      if (variant === 'tertiary') bgClasses = "bg-transparent border-transparent hover:bg-black/20 text-yellow-200 !shadow-none !border-none";
      
      return (
          <button
            onClick={onClick}
            className={`w-full px-8 py-4 text-lg lg:text-xl uppercase tracking-wider font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] border-b-4 rounded-sm font-cinzel ${bgClasses}`}
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >
            {children}
          </button>
      );
  }

  return (
    <div className="h-[100dvh] bg-stone-950 text-white font-sans flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-50"></div>
           <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80"></div>
           {/* Decorative floating cards (simple circles for now or css shapes) */}
           <div className="absolute top-10 left-10 w-32 h-48 border-4 border-white/5 rounded-lg rotate-[-12deg]"></div>
           <div className="absolute bottom-20 right-10 w-32 h-48 border-4 border-white/5 rounded-lg rotate-[12deg]"></div>
      </div>

      {/* Content Panel */}
      <div className="relative z-10 max-w-md w-full p-8 bg-stone-900/90 border-[6px] border-double border-yellow-700/50 shadow-2xl rounded-lg backdrop-blur-sm animate-fade-in-scale flex flex-col items-center">
        
        {/* Language Toggles */}
        <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={() => setLanguage('es-AR')} className={`transition-all duration-200 hover:scale-110 ${language === 'es-AR' ? 'opacity-100 grayscale-0' : 'opacity-50 grayscale'}`} aria-label="Español">
                <ARFlag />
            </button>
            <button onClick={() => setLanguage('en-US')} className={`transition-all duration-200 hover:scale-110 ${language === 'en-US' ? 'opacity-100 grayscale-0' : 'opacity-50 grayscale'}`} aria-label="English">
                <USFlag />
            </button>
        </div>
        
        {/* Logo / Title */}
        <div className="mb-10 text-center">
            <div className="inline-block mb-2 border-b-2 border-yellow-500/50 pb-2">
                <span className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase">La Tradición</span>
            </div>
            <h1 className="text-6xl lg:text-7xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-md">
            TRUCO
            </h1>
            <p className="text-stone-400 font-lora italic mt-2">{t('mainMenu.subtitle')}</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-4 w-full">
          <MenuButton onClick={() => handlePlayClick('playing')}>
            {t('mainMenu.play_normal')}
          </MenuButton>
          
          <MenuButton onClick={() => handlePlayClick('playing-with-help')} variant="secondary">
            {t('mainMenu.play_with_help')}
          </MenuButton>
          
          <div className="grid grid-cols-2 gap-4">
              <MenuButton onClick={onLearn} variant="secondary">
                {t('mainMenu.learn')}
              </MenuButton>
               <MenuButton onClick={onManual} variant="secondary">
                {t('mainMenu.manual')}
              </MenuButton>
          </div>

          <div className="flex justify-between mt-4 px-4 w-full border-t border-white/10 pt-4">
              <button onClick={() => setIsSettingsOpen(true)} className="text-stone-400 hover:text-yellow-300 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                  <span className="text-xl">⚙️</span> {t('mainMenu.options')}
              </button>
               <button onClick={onSimulate} className="text-stone-400 hover:text-cyan-300 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                  <span className="text-xl">🧪</span> {t('mainMenu.simulate')}
              </button>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {confirmModal.isOpen && (
        <ContinueGameModal
          onContinue={handleContinue}
          onNewGame={handleNewGame}
          onCancel={() => setConfirmModal({ isOpen: false, mode: null })}
        />
      )}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          isOpponentSoundEnabled={isOpponentSoundEnabled}
          onToggleOpponentSound={handleToggleOpponentSound}
          isAssistantSoundEnabled={isAssistantSoundEnabled}
          onToggleAssistantSound={handleToggleAssistantSound}
          opponentVoiceURI={opponentVoiceURI}
          onOpponentVoiceChange={handleOpponentVoiceChange}
          assistantVoiceURI={assistantVoiceURI}
          onAssistantVoiceChange={handleAssistantVoiceChange}
          isFlorEnabled={isFlorEnabled}
          onToggleFlor={handleToggleFlor}
        />
      )}
    </div>
  );
};

export default MainMenu;