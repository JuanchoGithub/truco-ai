import React from 'react';
import { Action, ActionType } from '../types';
import { useLocalization } from '../context/LocalizationContext';

interface AiBlurbProps {
  titleKey: string;
  text: string;
  isVisible: boolean;
  dispatch: React.Dispatch<Action>;
}

const AiBlurb: React.FC<AiBlurbProps> = ({ titleKey, text, isVisible, dispatch }) => {
  const { t } = useLocalization();

  const handleDismiss = () => {
    dispatch({ type: ActionType.CLEAR_AI_BLURB });
  };

  const getBlurbStyle = (key: string) => {
    switch (key) {
      case 'actionBar.truco':
      case 'actionBar.retruco':
      case 'actionBar.vale_cuatro':
        return {
          borderColor: '#ca8a04', // yellow-600
          textColor: '#fef08a', // yellow-200
          shadowColor: 'rgba(202, 138, 4, 0.4)',
          tailColor: '#ca8a04',
        };
      case 'actionBar.envido':
      case 'actionBar.real_envido':
      case 'actionBar.falta_envido':
        return {
          borderColor: '#2563eb', // blue-600
          textColor: '#bfdbfe', // blue-200
          shadowColor: 'rgba(37, 99, 235, 0.4)',
          tailColor: '#2563eb',
        };
      case 'actionBar.flor':
      case 'actionBar.contraflor':
        return {
          borderColor: '#9333ea', // purple-600
          textColor: '#e9d5ff', // purple-200
          shadowColor: 'rgba(147, 51, 234, 0.4)',
          tailColor: '#9333ea',
        };
      case 'actionBar.quiero':
      case 'actionBar.contraflor_quiero':
      case 'actionBar.flor_ack_good':
        return {
          borderColor: '#16a34a', // green-600
          textColor: '#bbf7d0', // green-200
          shadowColor: 'rgba(22, 163, 74, 0.4)',
          tailColor: '#16a34a',
        };
      case 'actionBar.no_quiero':
      case 'actionBar.contraflor_no_quiero':
        return {
          borderColor: '#dc2626', // red-600
          textColor: '#fecaca', // red-200
          shadowColor: 'rgba(220, 38, 38, 0.4)',
          tailColor: '#dc2626',
        };
      default: // Default style for other blurbs (trick wins/losses, etc)
        return {
          borderColor: '#0e7490', // cyan-600
          textColor: '#a5f3fc', // cyan-200
          shadowColor: 'rgba(14, 116, 144, 0.4)',
          tailColor: '#0e7490',
        };
    }
  };

  const style = getBlurbStyle(titleKey);
  const title = titleKey ? t(titleKey) : '';

  return (
    <div
      onClick={handleDismiss}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDismiss(); }}
      role={isVisible ? 'button' : undefined}
      tabIndex={isVisible ? 0 : -1}
      className={`absolute top-[70px] lg:top-[80px] left-1/2 -translate-x-1/2 w-80 lg:w-96 p-4 bg-black/80 border-2 rounded-lg shadow-lg transition-all duration-500 ease-in-out font-vt323 text-lg lg:text-xl text-center z-40 ${
        isVisible ? 'opacity-100 translate-y-0 cursor-pointer' : 'opacity-0 -translate-y-5 pointer-events-none'
      }`}
      style={{
        borderColor: style.borderColor,
        boxShadow: `0 4px 14px 0 ${style.shadowColor}`,
      }}
    >
      {/* Speech bubble tail pointing UP */}
      <div 
        className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px]"
        style={{ borderBottomColor: style.tailColor }}
      />
      {title && (
        <h3 className="font-bold font-cinzel text-xl mb-2 border-b pb-1" style={{ color: style.textColor, borderColor: `${style.borderColor}80` }}>{title}</h3>
      )}
      <p style={{ color: style.textColor, textShadow: '0 0 5px currentColor' }}>"{text}"</p>
    </div>
  );
};

export default AiBlurb;
