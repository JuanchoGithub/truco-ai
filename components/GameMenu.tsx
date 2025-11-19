
import React, { useState, useRef, useEffect } from 'react';
import { useLocalization } from '../context/LocalizationContext';

interface GameMenuProps {
    gameMode: 'playing' | 'playing-with-help';
    isSoundEnabled: boolean;
    isDebugMode: boolean;
    onToggleSound: () => void;
    onToggleDebug: () => void;
    onShowData: () => void;
    onGoToMainMenu: () => void;
    onOpenMenu?: () => void;
}

const GameMenu: React.FC<GameMenuProps> = ({
    gameMode,
    isSoundEnabled,
    isDebugMode,
    onToggleSound,
    onToggleDebug,
    onShowData,
    onGoToMainMenu,
    onOpenMenu,
}) => {
    const { t } = useLocalization();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const soundLabel = gameMode === 'playing-with-help' 
        ? t('gameMenu.sound_on_advice')
        : t('gameMenu.sound_on_verses');

    const MenuItem: React.FC<{ onClick: () => void; children: React.ReactNode; isActive?: boolean, danger?: boolean }> = ({ onClick, children, isActive, danger }) => (
        <button
            onClick={() => {
                onClick();
                setIsOpen(false);
            }}
            className={`w-full text-left px-4 py-3 text-sm flex justify-between items-center transition-all duration-150 border-b border-white/5 last:border-0
                ${danger ? 'text-red-300 hover:bg-red-900/30' : 'text-amber-100 hover:bg-amber-900/30 hover:text-white'}
            `}
        >
            <span className="font-cinzel font-semibold tracking-wide">{children}</span>
            {isActive !== undefined && (
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isActive ? 'border-green-500 bg-green-900/50' : 'border-gray-600 bg-black/20'}`}>
                    {isActive && <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]"></div>}
                </div>
            )}
        </button>
    );

    const handleToggleMenu = () => {
        const nextIsOpen = !isOpen;
        setIsOpen(nextIsOpen);
        if (nextIsOpen && onOpenMenu) {
            onOpenMenu();
        }
    };

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <div>
                <button
                    type="button"
                    onClick={handleToggleMenu}
                    className={`
                        px-3 py-1.5 text-xs lg:px-4 lg:py-2 lg:text-sm font-bold uppercase tracking-wider rounded-lg shadow-lg transition-all border-b-[3px] active:translate-y-[2px] active:shadow-none
                        bg-gradient-to-b from-stone-700 to-stone-800 border-stone-950 text-stone-200 hover:from-stone-600 hover:to-stone-700
                        flex items-center gap-2
                    `}
                    id="menu-button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                >
                    <span>{t('gameMenu.menu')}</span>
                     <svg className={`-mr-1 h-4 w-4 text-stone-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <div
                    className="origin-top-right absolute right-0 mt-2 w-64 rounded-xl shadow-2xl bg-stone-900 border-2 border-amber-700/50 ring-1 ring-black ring-opacity-50 focus:outline-none z-50 overflow-hidden"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="menu-button"
                    style={{ animation: 'fadeIn 0.15s ease-out forwards' }}
                >
                    <div className="bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-20 absolute inset-0 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="px-4 py-2 border-b border-amber-700/30 bg-black/20">
                             <span className="text-[10px] text-amber-500 uppercase tracking-[0.2em] font-bold">{t('gameMenu.options')}</span>
                        </div>
                        <MenuItem onClick={onShowData}>{t('gameMenu.view_data')}</MenuItem>
                        <MenuItem onClick={onToggleDebug} isActive={isDebugMode}>{t('gameMenu.view_ai_cards')}</MenuItem>
                        <MenuItem onClick={onToggleSound} isActive={isSoundEnabled}>{soundLabel}</MenuItem>
                        <div className="border-t border-amber-700/30 mt-1 pt-1 bg-black/10">
                             <MenuItem onClick={onGoToMainMenu} danger>{t('gameMenu.main_menu')}</MenuItem>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameMenu;
