
import React, { useState, useRef, useEffect } from 'react';

interface GameMenuProps {
    gameMode: 'playing' | 'playing-with-help';
    isSoundEnabled: boolean;
    isDebugMode: boolean;
    onToggleSound: () => void;
    onToggleDebug: () => void;
    onShowData: () => void;
    onGoToMainMenu: () => void;
}

const GameMenu: React.FC<GameMenuProps> = ({
    gameMode,
    isSoundEnabled,
    isDebugMode,
    onToggleSound,
    onToggleDebug,
    onShowData,
    onGoToMainMenu,
}) => {
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
        ? 'Escuchar consejos de la IA' 
        : 'Escuchar versos de la IA';

    const MenuItem: React.FC<{ onClick: () => void; children: React.ReactNode; isActive?: boolean }> = ({ onClick, children, isActive }) => (
        <button
            onClick={() => {
                onClick();
                setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-yellow-600/50 flex justify-between items-center transition-colors duration-150"
        >
            <span>{children}</span>
            {isActive !== undefined && (
                <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-500'} border border-black`}></span>
            )}
        </button>
    );

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <div>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="px-3 py-1.5 text-xs lg:px-4 lg:py-2 lg:text-sm rounded-lg font-semibold text-yellow-200 bg-black/40 border-2 border-yellow-800/80 shadow-md hover:bg-black/60 hover:border-yellow-600 transition-colors flex items-center gap-2"
                    id="menu-button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                >
                    MENÚ
                     <svg className={`-mr-1 h-5 w-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <div
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800/90 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="menu-button"
                    style={{ animation: 'fadeIn 0.15s ease-out forwards' }}
                >
                    <div className="py-1" role="none">
                        <MenuItem onClick={onGoToMainMenu}>Menu Principal</MenuItem>
                        <MenuItem onClick={onShowData}>Ver Datos</MenuItem>
                        <MenuItem onClick={onToggleDebug} isActive={isDebugMode}>Ver Cartas de la IA</MenuItem>
                        <MenuItem onClick={onToggleSound} isActive={isSoundEnabled}>{soundLabel}</MenuItem>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameMenu;
