
import React from 'react';
import Card from './Card';
import { Card as CardType } from '../types';
import { useLocalization } from '../context/LocalizationContext';

interface ManualProps {
  onExit: () => void;
  isFlorEnabled: boolean;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-10 last:mb-0">
    <h2 className="text-2xl font-cinzel text-amber-900 mb-4 border-b-2 border-amber-900/20 pb-2">{title}</h2>
    <div className="space-y-4 text-stone-800 leading-relaxed text-base font-lora text-justify">
        {children}
    </div>
  </section>
);

const Example: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="p-5 bg-stone-200/50 border border-stone-300 rounded-sm my-6 shadow-sm">
        <strong className="text-amber-900 block mb-3 text-lg font-cinzel border-b border-stone-300 pb-1">{title}</strong>
        <div className="text-sm space-y-2 text-stone-700">{children}</div>
    </div>
);

const CardDisplay: React.FC<{ card: CardType, label?: string }> = ({ card, label }) => (
    <div className="inline-flex flex-col items-center mx-1 align-middle transform translate-y-2">
        <Card card={card} size="small" />
        {label && <span className="text-[10px] mt-1 text-stone-500 uppercase tracking-wider">{label}</span>}
    </div>
);


const Manual: React.FC<ManualProps> = ({ onExit, isFlorEnabled }) => {
    const { t } = useLocalization();
    
  return (
    <div className="h-[100dvh] bg-stone-950 flex flex-col items-center relative overflow-hidden">
        {/* Background Texture */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-40"></div>
        
        {/* Header Bar */}
        <div className="w-full z-20 bg-stone-900 border-b-4 border-amber-700/50 shadow-lg p-4 flex justify-between items-center">
            <h1 className="text-2xl lg:text-3xl font-cinzel font-bold text-amber-400 tracking-widest ml-2">
                {t('manual.title')}
            </h1>
            <button 
                onClick={onExit} 
                className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-stone-300 border border-stone-600 rounded hover:bg-stone-800 hover:text-white transition-colors"
            >
                {t('manual.exitButton')}
            </button>
        </div>

        {/* Document Container */}
        <div className="w-full max-w-4xl flex-grow overflow-y-auto p-4 lg:p-8 z-10 custom-scrollbar">
            <div className="bg-[#f2f0e4] text-stone-900 p-8 lg:p-12 rounded-sm shadow-[0_0_30px_rgba(0,0,0,0.5)] min-h-full relative">
                {/* Paper Texture Overlay */}
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 pointer-events-none rounded-sm"></div>
                 
                 <div className="relative z-10">
                    <Section title={t('manual.welcome.title')}>
                        <p>{t('manual.welcome.p1_1')}<em>{t('manual.welcome.p1_em')}</em>{t('manual.welcome.p1_2')}</p>
                        <p>{t('manual.welcome.p2_1')}<strong>{t('manual.welcome.p2_strong1')}</strong>{t('manual.welcome.p2_2')}<strong>{t('manual.welcome.p2_strong2')}</strong>{t('manual.welcome.p2_3_base')}{isFlorEnabled && t('manual.welcome.p2_flor_addon')}</p>
                    </Section>

                    <Section title={t('manual.basics.title')}>
                        <p><strong>{t('manual.basics.p1_strong')}</strong> {t('manual.basics.p1_text')}</p>
                        <p><strong>{t('manual.basics.p2_strong')}</strong> {t('manual.basics.p2_text')}</p>
                        <p><strong>{t('manual.basics.p3_strong')}</strong> {t('manual.basics.p3_text')}</p>
                    </Section>
                    
                    <Section title={t('manual.fundamentals.title')}>
                        <p>{t('manual.fundamentals.p1')}</p>
                        <div className="overflow-x-auto mt-6 mb-6 border border-stone-400 shadow-sm rounded-sm">
                            <table className="w-full text-left text-sm lg:text-base border-collapse bg-white">
                                <thead className="bg-stone-200 text-stone-800 font-cinzel">
                                    <tr>
                                        <th className="border-b border-stone-300 p-3">{t('manual.fundamentals.table.h1')}</th>
                                        <th className="border-b border-stone-300 p-3">{t('manual.fundamentals.table.h2')}</th>
                                        <th className="border-b border-stone-300 p-3">{t('manual.fundamentals.table.h3')}</th>
                                        <th className="border-b border-stone-300 p-3">{t('manual.fundamentals.table.h4')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-200 text-stone-700">
                                    {isFlorEnabled && <tr className="hover:bg-stone-50"><td className="p-3 font-bold bg-stone-100">{t('manual.fundamentals.table.r1c1')}</td><td className="p-3">{t('manual.fundamentals.table.r1c2')}</td><td className="p-3">{t('manual.fundamentals.table.r1c3')}</td><td className="p-3 font-mono text-amber-700">{t('manual.fundamentals.table.r1c4')}</td></tr>}
                                    <tr className="hover:bg-stone-50"><td className="p-3 font-bold bg-stone-100">{t('manual.fundamentals.table.r2c1')}</td><td className="p-3">{t('manual.fundamentals.table.r2c2')}</td><td className="p-3">{t('manual.fundamentals.table.r2c3')}</td><td className="p-3 font-mono text-amber-700">{t('manual.fundamentals.table.r2c4')}</td></tr>
                                    <tr className="hover:bg-stone-50"><td className="p-3 font-bold bg-stone-100">{t('manual.fundamentals.table.r3c1')}</td><td className="p-3">{t('manual.fundamentals.table.r3c2')}</td><td className="p-3">{t('manual.fundamentals.table.r3c3')}</td><td className="p-3 font-mono text-amber-700">{t('manual.fundamentals.table.r3c4')}</td></tr>
                                    <tr className="hover:bg-stone-50"><td className="p-3 font-bold bg-stone-100">{t('manual.fundamentals.table.r4c1')}</td><td className="p-3">{t('manual.fundamentals.table.r4c2')}</td><td className="p-3">{t('manual.fundamentals.table.r4c3')}</td><td className="p-3 font-mono text-stone-400">{t('manual.fundamentals.table.r4c4')}</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-4 italic text-stone-600"><strong>{t('manual.fundamentals.p2_strong')}</strong> {t('manual.fundamentals.p2_text')}</p>
                    </Section>

                    <Section title={t('manual.phases.title')}>
                        <p>{t('manual.phases.p1_1')}<strong className="text-amber-800">{t('manual.phases.p1_strong')}</strong>{t('manual.phases.p1_2')}</p>
                        
                        {/* Envido Section */}
                        <div className="mt-4">
                            <h3 className="text-xl font-cinzel mb-2 text-amber-900">{t('manual.phases.envido.title')}</h3>
                            <p>{t('manual.phases.envido.p1')}</p>
                             <div className="overflow-x-auto mt-4 mb-4 border border-stone-400 shadow-sm rounded-sm">
                                <table className="w-full text-left text-sm border-collapse bg-white">
                                    <thead className="bg-stone-200 text-stone-800 font-cinzel">
                                        <tr>
                                            <th className="border-b border-stone-300 p-2">{t('manual.phases.envido.table.h1')}</th>
                                            <th className="border-b border-stone-300 p-2 text-center">{t('manual.phases.envido.table.h2')}</th>
                                            <th className="border-b border-stone-300 p-2 text-center">{t('manual.phases.envido.table.h3')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-200 text-stone-700">
                                        <tr><td className="p-2 font-bold">{t('manual.phases.envido.table.r1c1')}</td><td className="p-2 text-center">2</td><td className="p-2 text-center">1</td></tr>
                                        <tr><td className="p-2 font-bold">{t('manual.phases.envido.table.r2c1')}</td><td className="p-2 text-center">3</td><td className="p-2 text-center">1</td></tr>
                                        <tr><td className="p-2 font-bold">{t('manual.phases.envido.table.r3c1')}</td><td className="p-2 text-center">4</td><td className="p-2 text-center">2</td></tr>
                                        <tr><td className="p-2 font-bold">{t('manual.phases.envido.table.r4c1')}</td><td className="p-2 text-center">{t('manual.phases.envido.table.r4c2')}</td><td className="p-2 text-center">1</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Flor Section */}
                        {isFlorEnabled && (
                            <div className="mt-6">
                                <h3 className="text-xl font-cinzel mb-2 text-amber-900">{t('manual.phases.flor.title')}</h3>
                                <p>{t('manual.phases.flor.p1_1')}<strong>{t('manual.phases.flor.p1_strong')}</strong>{t('manual.phases.flor.p1_2')}</p>
                            </div>
                        )}

                        {/* Truco Section */}
                        <div className="mt-6">
                            <h3 className="text-xl font-cinzel mb-2 text-amber-900">{t('manual.phases.truco.title')}</h3>
                            <p>{t('manual.phases.truco.p1')}</p>
                            <ul className="list-disc list-inside mt-2 ml-4">
                                <li><strong>{t('manual.phases.truco.li1_strong')}</strong>{t('manual.phases.truco.li1_text')}</li>
                                <li><strong>{t('manual.phases.truco.li2_strong')}</strong>{t('manual.phases.truco.li2_text')}</li>
                                <li><strong>{t('manual.phases.truco.li3_strong')}</strong>{t('manual.phases.truco.li3_text')}</li>
                            </ul>
                        </div>
                    </Section>
                    
                    <div className="mt-8 p-6 bg-stone-100 border-l-4 border-amber-700">
                             <h3 className="text-xl font-cinzel mb-2 text-amber-900">{t('manual.strategy.title')}</h3>
                             <p>{t('manual.strategy.p1')}</p>
                             <ul className="list-disc list-inside mt-4 space-y-2 marker:text-amber-600">
                                <li><strong>{t('manual.strategy.tips.li1_strong')}</strong>{t('manual.strategy.tips.li1_text')}</li>
                                <li><strong>{t('manual.strategy.tips.li2_strong')}</strong>{t('manual.strategy.tips.li2_text')}</li>
                                <li><strong>{t('manual.strategy.tips.li3_strong')}</strong>{t('manual.strategy.tips.li3_text')}</li>
                                <li><strong>{t('manual.strategy.tips.li4_strong')}</strong>{t('manual.strategy.tips.li4_text')}</li>
                            </ul>
                        </div>

                         <Section title={t('manual.scenarios.title')}>
                            <p className="mb-4">{t('manual.scenarios.p1')}</p>
                            <Example title={t('manual.scenarios.ex1.title')}>
                                <p><strong>{t('manual.basics.p3_strong')}</strong> {t('manual.scenarios.ex1.setup_1')}<CardDisplay card={{rank:4, suit:'copas'} as CardType} /> <CardDisplay card={{rank:5, suit:'copas'} as CardType} /> <CardDisplay card={{rank:12, suit:'oros'} as CardType} />{t('manual.scenarios.ex1.setup_2')}<strong>{t('manual.scenarios.ex1.setup_strong')}</strong>{t('manual.scenarios.ex1.setup_3')}</p>
                                <p className="mt-2"><strong>{t('common.you')}:</strong> {t('manual.scenarios.ex1.game')}</p>
                                <p><strong>{t('common.round')}:</strong> {t('manual.scenarios.ex1.result')}</p>
                            </Example>
                        </Section>
                 </div>
            </div>
        </div>
    </div>
  );
};

export default Manual;
