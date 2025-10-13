
import React from 'react';
import { useLocalization } from '../context/LocalizationContext';

interface ContinueGameModalProps {
  onContinue: () => void;
  onNewGame: () => void;
  onCancel: () => void;
}

const ContinueGameModal: React.FC<ContinueGameModalProps> = ({ onContinue, onNewGame, onCancel }) => {
  const { t } = useLocalization();
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in-scale">
      <div className="bg-green-800 border-4 border-yellow-500 rounded-xl shadow-2xl p-6 lg:p-8 text-center w-full max-w-md">
        <h2 className="text-2xl lg:text-3xl font-bold text-yellow-300 mb-4 font-cinzel">
          {t('continueGameModal.title')}
        </h2>
        <p className="text-base lg:text-lg text-gray-200 mb-8">
          {t('continueGameModal.message')}
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onContinue}
            className="px-6 py-2 text-base lg:text-lg bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-500 transition-colors duration-200 border-b-4 border-green-800"
          >
            {t('continueGameModal.continue')}
          </button>
          <button
            onClick={onNewGame}
            className="px-6 py-2 text-base lg:text-lg bg-yellow-600 text-white font-bold rounded-lg shadow-lg hover:bg-yellow-500 transition-colors duration-200 border-b-4 border-yellow-800"
          >
            {t('continueGameModal.new_game')}
          </button>
        </div>
        <button onClick={onCancel} className="mt-6 text-sm text-gray-400 hover:text-white transition-colors">
            {t('common.cancel')}
        </button>
      </div>
    </div>
  );
};

export default ContinueGameModal;