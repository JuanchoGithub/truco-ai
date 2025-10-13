import React, { useEffect } from 'react';
import { useLocalization } from '../context/LocalizationContext';

interface SoundHintProps {
  isVisible: boolean;
  onDismiss: () => void;
}

const SoundHint: React.FC<SoundHintProps> = ({ isVisible, onDismiss }) => {
  const { t } = useLocalization();

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className="absolute top-16 right-2 z-50 p-3 bg-gray-800/90 border border-yellow-400/80 rounded-lg shadow-lg w-64 text-center cursor-pointer animate-fade-in-scale"
      onClick={onDismiss}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onDismiss()}
      role="button"
      tabIndex={0}
      aria-label="Hint: Activate AI voice. Click to dismiss."
    >
      <div className="absolute -top-6 right-8 text-yellow-300 animate-bounce">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </div>
      <p className="text-sm text-yellow-200 flex items-center justify-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
        </svg>
        <span>{t('soundHint.activate_voice')}</span>
      </p>
    </div>
  );
};

export default SoundHint;