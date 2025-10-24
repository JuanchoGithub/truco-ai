import React from 'react';
import Card from './Card';
import { Card as CardType } from '../types';
import { useLocalization } from '../context/LocalizationContext';

interface ManualProps {
  onExit: () => void;
  isFlorEnabled: boolean;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-8 p-4 bg-black/20 rounded-lg border-2 border-yellow-800/30">
    <h2 className="text-2xl font-cinzel text-yellow-300 mb-4 border-b-2 border-yellow-800/50 pb-2">{title}</h2>
    <div className="space-y-4 text-gray-200 leading-relaxed text-base prose prose-invert max-w-none prose-p:text-gray-200 prose-ul:text-gray-300 prose-strong:text-yellow-200 prose-headings:text-yellow-300">{children}</div>
  </section>
);

const Example: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="p-4 bg-green-900/40 border-2 border-yellow-600/30 rounded-md my-4">
        <strong className="text-yellow-200 block mb-3 text-lg font-semibold">{title}</strong>
        <div className="text-sm space-y-2">{children}</div>
    </div>
);

const CardDisplay: React.FC<{ card: CardType, label?: string }> = ({ card, label }) => (
    <div className="inline-flex flex-col items-center mx-1 align-middle">
        <Card card={card} size="small" />
        {label && <span className="text-xs mt-1 text-yellow-200 text-center">{label}</span>}
    </div>
);


const Manual: React.FC<ManualProps> = ({ onExit, isFlorEnabled }) => {
    const { t } = useLocalization();
    
  return (
    <div className="h-screen bg-green-900 text-white font-lora flex flex-col items-center p-2 lg:p-4" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')" }}>
        <div className="w-full max-w-5xl flex justify-between items-center mb-4 flex-shrink-0 px-2">
            <h1 className="text-2xl lg:text-4xl font-cinzel text-yellow-300" style={{ textShadow: '2px 2px 4px #000' }}>{t('manual.title')}</h1>
            <button onClick={onExit} className="px-4 py-2 text-sm rounded-md border-2 bg-red-700/80 border-red-500 text-white transition-colors hover:bg-red-600/90 flex-shrink-0">{t('manual.exitButton')}</button>
        </div>
        <div className="w-full max-w-5xl overflow-y-auto flex-grow p-2 lg:p-4 bg-black/40 rounded-lg border-2 border-yellow-900/50">
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
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left text-sm lg:text-base border-collapse">
                        <thead className="bg-black/40 text-amber-100">
                            <tr>
                                <th className="border border-yellow-800/50 p-2">{t('manual.fundamentals.table.h1')}</th>
                                <th className="border border-yellow-800/50 p-2">{t('manual.fundamentals.table.h2')}</th>
                                <th className="border border-yellow-800/50 p-2">{t('manual.fundamentals.table.h3')}</th>
                                <th className="border border-yellow-800/50 p-2">{t('manual.fundamentals.table.h4')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-black/20">
                            {isFlorEnabled && <tr><td className="border p-2 font-bold text-center">{t('manual.fundamentals.table.r1c1')}</td><td className="border p-2">{t('manual.fundamentals.table.r1c2')}</td><td className="border p-2">{t('manual.fundamentals.table.r1c3')}</td><td className="border p-2">{t('manual.fundamentals.table.r1c4')}</td></tr>}
                            <tr><td className="border p-2 font-bold text-center">{t('manual.fundamentals.table.r2c1')}</td><td className="border p-2">{t('manual.fundamentals.table.r2c2')}</td><td className="border p-2">{t('manual.fundamentals.table.r2c3')}</td><td className="border p-2">{t('manual.fundamentals.table.r2c4')}</td></tr>
                            <tr><td className="border p-2 font-bold text-center">{t('manual.fundamentals.table.r3c1')}</td><td className="border p-2">{t('manual.fundamentals.table.r3c2')}</td><td className="border p-2">{t('manual.fundamentals.table.r3c3')}</td><td className="border p-2">{t('manual.fundamentals.table.r3c4')}</td></tr>
                            <tr><td className="border p-2 font-bold text-center">{t('manual.fundamentals.table.r4c1')}</td><td className="border p-2">{t('manual.fundamentals.table.r4c2')}</td><td className="border p-2">{t('manual.fundamentals.table.r4c3')}</td><td className="border p-2">{t('manual.fundamentals.table.r4c4')}</td></tr>
                            <tr><td className="border p-2 font-bold text-center">{t('manual.fundamentals.table.r5c1')}</td><td className="border p-2">{t('manual.fundamentals.table.r5c2')}</td><td className="border p-2">{t('manual.fundamentals.table.r5c3')}</td><td className="border p-2">{t('manual.fundamentals.table.r5c4')}</td></tr>
                            <tr><td className="border p-2 font-bold text-center">{t('manual.fundamentals.table.r6c1')}</td><td className="border p-2">{t('manual.fundamentals.table.r6c2')}</td><td className="border p-2">{t('manual.fundamentals.table.r6c3')}</td><td className="border p-2">{t('manual.fundamentals.table.r6c4')}</td></tr>
                            <tr><td className="border p-2 font-bold text-center">{t('manual.fundamentals.table.r7c1')}</td><td className="border p-2">{t('manual.fundamentals.table.r7c2')}</td><td className="border p-2">{t('manual.fundamentals.table.r7c3')}</td><td className="border p-2">{t('manual.fundamentals.table.r7c4')}</td></tr>
                            <tr><td className="border p-2 font-bold text-center">{t('manual.fundamentals.table.r8c1')}</td><td className="border p-2">{t('manual.fundamentals.table.r8c2')}</td><td className="border p-2">{t('manual.fundamentals.table.r8c3')}</td><td className="border p-2">{t('manual.fundamentals.table.r8c4')}</td></tr>
                            <tr><td className="border p-2 font-bold text-center">{t('manual.fundamentals.table.r9c1')}</td><td className="border p-2">{t('manual.fundamentals.table.r9c2')}</td><td className="border p-2">{t('manual.fundamentals.table.r9c3')}</td><td className="border p-2">{t('manual.fundamentals.table.r9c4')}</td></tr>
                        </tbody>
                    </table>
                </div>
                 <p className="mt-4"><strong>{t('manual.fundamentals.p2_strong')}</strong> {t('manual.fundamentals.p2_text')}</p>
            </Section>

            <Section title={t('manual.phases.title')}>
                <p>{t('manual.phases.p1_1')}<strong>{t('manual.phases.p1_strong')}</strong>{t('manual.phases.p1_2')}</p>
                {isFlorEnabled && <>
                    <h3 className="text-xl font-cinzel mt-6">{t('manual.phases.flor.title')}</h3>
                    <p>{t('manual.phases.flor.p1_1')}<strong>{t('manual.phases.flor.p1_strong')}</strong>{t('manual.phases.flor.p1_2')}</p>
                </>}
                <h3 className="text-xl font-cinzel mt-6">{t('manual.phases.envido.title')}</h3>
                <p>{t('manual.phases.envido.p1')}</p>
                 <table className="w-full text-left text-sm border-collapse mt-2">
                    <thead className="bg-black/40 text-amber-100"><tr><th className="border p-2">{t('manual.phases.envido.table.h1')}</th><th className="border p-2">{t('manual.phases.envido.table.h2')}</th><th className="border p-2">{t('manual.phases.envido.table.h3')}</th><th className="border p-2">{t('manual.phases.envido.table.h4')}</th></tr></thead>
                    <tbody className="bg-black/20">
                        <tr><td className="border p-2">{t('manual.phases.envido.table.r1c1')}</td><td className="border p-2">{t('manual.phases.envido.table.r1c2')}</td><td className="border p-2">{t('manual.phases.envido.table.r1c3')}</td><td className="border p-2">{t('manual.phases.envido.table.r1c4')}</td></tr>
                        <tr><td className="border p-2">{t('manual.phases.envido.table.r2c1')}</td><td className="border p-2">{t('manual.phases.envido.table.r2c2')}</td><td className="border p-2">{t('manual.phases.envido.table.r2c3')}</td><td className="border p-2">{t('manual.phases.envido.table.r2c4')}</td></tr>
                        <tr><td className="border p-2">{t('manual.phases.envido.table.r3c1')}</td><td className="border p-2">{t('manual.phases.envido.table.r3c2')}</td><td className="border p-2">{t('manual.phases.envido.table.r3c3')}</td><td className="border p-2">{t('manual.phases.envido.table.r3c4')}</td></tr>
                        <tr><td className="border p-2">{t('manual.phases.envido.table.r4c1')}</td><td className="border p-2">{t('manual.phases.envido.table.r4c2')}</td><td className="border p-2">{t('manual.phases.envido.table.r4c3')}</td><td className="border p-2">{t('manual.phases.envido.table.r4c4')}</td></tr>
                    </tbody>
                </table>
                <h3 className="text-xl font-cinzel mt-6">{t('manual.phases.truco.title')}</h3>
                <p>{t('manual.phases.truco.p1')}</p>
                <ul>
                    <li><strong>{t('manual.phases.truco.li1_strong')}</strong>{t('manual.phases.truco.li1_text')}</li>
                    <li><strong>{t('manual.phases.truco.li2_strong')}</strong>{t('manual.phases.truco.li2_text')}</li>
                    <li><strong>{t('manual.phases.truco.li3_strong')}</strong>{t('manual.phases.truco.li3_text')}</li>
                </ul>
                <h4 className="text-lg font-cinzel mt-4">{t('manual.phases.tie.title')}</h4>
                 <table className="w-full text-left text-sm border-collapse mt-2">
                    <thead className="bg-black/40 text-amber-100"><tr><th className="border p-2">{t('manual.phases.tie.table.h1')}</th><th className="border p-2">{t('manual.phases.tie.table.h2')}</th></tr></thead>
                    <tbody className="bg-black/20">
                        <tr><td className="border p-2">{t('manual.phases.tie.table.r1c1')}</td><td className="border p-2">{t('manual.phases.tie.table.r1c2')}</td></tr>
                        <tr><td className="border p-2">{t('manual.phases.tie.table.r2c1')}</td><td className="border p-2">{t('manual.phases.tie.table.r2c2')}</td></tr>
                        <tr><td className="border p-2">{t('manual.phases.tie.table.r3c1')}</td><td className="border p-2">{t('manual.phases.tie.table.r3c2')}</td></tr>
                    </tbody>
                </table>
            </Section>

            <Section title={t('manual.scenarios.title')}>
                <p>{t('manual.scenarios.p1')}</p>
                
                <Example title={t('manual.scenarios.ex1.title')}>
                    <p><strong>{t('manual.basics.p3_strong')}</strong> {t('manual.scenarios.ex1.setup_1')}<CardDisplay card={{rank:4, suit:'copas'} as CardType} /> <CardDisplay card={{rank:5, suit:'copas'} as CardType} /> <CardDisplay card={{rank:12, suit:'oros'} as CardType} />{t('manual.scenarios.ex1.setup_2')}<strong>{t('manual.scenarios.ex1.setup_strong')}</strong>{t('manual.scenarios.ex1.setup_3')}</p>
                    <p><strong>{t('common.you')}:</strong> {t('manual.scenarios.ex1.game')}</p>
                    <p><strong>{t('common.round')}:</strong> {t('manual.scenarios.ex1.result')}</p>
                    <p><strong>{t('mainMenu.learn')}:</strong> {t('manual.scenarios.ex1.lesson')}</p>
                    <p className="mt-2 p-2 bg-black/30 rounded"><strong>{t('manual.scenarios.quiz')}</strong> {t('manual.scenarios.ex1.quiz_q')} <em>({t('manual.scenarios.answer')} {t('manual.scenarios.ex1.quiz_a')})</em></p>
                </Example>

                <Example title={t('manual.scenarios.ex2.title')}>
                    <p><strong>{t('manual.basics.p3_strong')}</strong> {t('manual.scenarios.ex2.setup')}<CardDisplay card={{rank:6, suit:'bastos'} as CardType} /> <CardDisplay card={{rank:10, suit:'espadas'} as CardType} /> <CardDisplay card={{rank:2, suit:'oros'} as CardType} />. Your Envido is low (6). The opponent calls "Truco".</p>
                    <p><strong>{t('common.you')}:</strong> {t('manual.scenarios.ex2.game')}</p>
                    <p><strong>{t('common.round')}:</strong> {t('manual.scenarios.ex2.result')}</p>
                    <p><strong>{t('mainMenu.learn')}:</strong> {t('manual.scenarios.ex2.lesson')}</p>
                </Example>

                {isFlorEnabled && <Example title={t('manual.scenarios.ex3.title')}>
                    <p><strong>{t('manual.basics.p3_strong')}</strong> {t('manual.scenarios.ex3.setup_1')}<CardDisplay card={{rank:7, suit:'copas'} as CardType} /> <CardDisplay card={{rank:4, suit:'copas'} as CardType} /> <CardDisplay card={{rank:3, suit:'copas'} as CardType} />{t('manual.scenarios.ex3.setup_2')}</p>
                    <p><strong>{t('common.you')}:</strong> {t('manual.scenarios.ex3.game')}</p>
                    <p><strong>{t('common.round')}:</strong> {t('manual.scenarios.ex3.result')}</p>
                    <p><strong>{t('mainMenu.learn')}:</strong> {t('manual.scenarios.ex3.lesson')}</p>
                    <p className="mt-2 p-2 bg-black/30 rounded"><strong>{t('manual.scenarios.quiz')}</strong> {t('manual.scenarios.ex3.quiz_q')} <em>({t('manual.scenarios.answer')} {t('manual.scenarios.ex3.quiz_a')})</em></p>
                </Example>}

                 <Example title={t('manual.scenarios.ex4.title')}>
                    <p><strong>{t('manual.basics.p3_strong')}</strong> {t('manual.scenarios.ex4.setup_1')}<CardDisplay card={{rank:3, suit:'bastos'} as CardType} /> <CardDisplay card={{rank:2, suit:'copas'} as CardType} /> <CardDisplay card={{rank:5, suit:'espadas'} as CardType} />{t('manual.scenarios.ex4.setup_2')}</p>
                    <p><strong>{t('common.you')}:</strong> {t('manual.scenarios.ex4.game')}</p>
                    <p><strong>{t('common.round')}:</strong> {t('manual.scenarios.ex4.result')}</p>
                    <p><strong>{t('mainMenu.learn')}:</strong> {t('manual.scenarios.ex4.lesson')}</p>
                </Example>

                 <Example title={t('manual.scenarios.ex5.title')}>
                    <p><strong>{t('manual.basics.p3_strong')}</strong> {t('manual.scenarios.ex5.setup')}<CardDisplay card={{rank:3, suit:'copas'}}/>.</p>
                    <p><strong>{t('common.you')}:</strong> {t('manual.scenarios.ex5.game')}</p>
                    <p><strong>{t('common.round')}:</strong> {t('manual.scenarios.ex5.result')}</p>
                    <p><strong>{t('mainMenu.learn')}:</strong> {t('manual.scenarios.ex5.lesson')}</p>
                     <p className="mt-2 p-2 bg-black/30 rounded"><strong>{t('manual.scenarios.quiz')}</strong> {t('manual.scenarios.ex5.quiz_q')} <em>({t('manual.scenarios.answer')} {t('manual.scenarios.ex5.quiz_a')})</em></p>
                </Example>

                <Example title={t('manual.scenarios.ex6.title')}>
                    <p><strong>{t('manual.basics.p3_strong')}</strong> {t('manual.scenarios.ex6.setup_1')}<CardDisplay card={{rank:7, suit:'espadas'}}/>, <CardDisplay card={{rank:6, suit:'bastos'}}/>, <CardDisplay card={{rank:10, suit:'oros'}}/>{t('manual.scenarios.ex6.setup_2')}</p>
                    <p><strong>{t('common.you')}:</strong> {t('manual.scenarios.ex6.game')}</p>
                    <p><strong>{t('common.round')}:</strong> {t('manual.scenarios.ex6.result')}</p>
                    <p><strong>{t('mainMenu.learn')}:</strong> {t('manual.scenarios.ex6.lesson')}</p>
                </Example>

                <Example title={t('manual.scenarios.ex7.title')}>
                    <p><strong>{t('manual.basics.p3_strong')}</strong> {t('manual.scenarios.ex7.setup_1')}<CardDisplay card={{rank:7, suit:'bastos'} as CardType} /> <CardDisplay card={{rank:6, suit:'bastos'} as CardType} /> <CardDisplay card={{rank:1, suit:'oros'} as CardType} />{t('manual.scenarios.ex7.setup_2')}</p>
                    <p><strong>{t('common.you')}:</strong> {t('manual.scenarios.ex7.game')}</p>
                    <p><strong>{t('common.round')}:</strong> {t('manual.scenarios.ex7.result')}</p>
                    <p><strong>{t('mainMenu.learn')}:</strong> {t('manual.scenarios.ex7.lesson')}</p>
                </Example>
                
                {isFlorEnabled && <Example title={t('manual.scenarios.ex8.title')}>
                    <p><strong>{t('manual.basics.p3_strong')}</strong> {t('manual.scenarios.ex8.setup_1')}<CardDisplay card={{rank:7, suit:'oros'}}/>, <CardDisplay card={{rank:6, suit:'oros'}}/>, <CardDisplay card={{rank:5, suit:'oros'}}/>{t('manual.scenarios.ex8.setup_2')}</p>
                    <p><strong>{t('common.you')}:</strong> {t('manual.scenarios.ex8.game')}</p>
                    <p><strong>{t('common.round')}:</strong> {t('manual.scenarios.ex8.result')}</p>
                    <p><strong>{t('mainMenu.learn')}:</strong> {t('manual.scenarios.ex8.lesson')}</p>
                </Example>}
            </Section>

            <Section title={t('manual.strategy.title')}>
                <p>{t('manual.strategy.p1')}</p>
                <h3 className="text-xl font-cinzel mt-4">{t('manual.strategy.tips.title')}</h3>
                <ul>
                    <li><strong>{t('manual.strategy.tips.li1_strong')}</strong>{t('manual.strategy.tips.li1_text')}</li>
                    <li><strong>{t('manual.strategy.tips.li2_strong')}</strong>{t('manual.strategy.tips.li2_text')}</li>
                    <li><strong>{t('manual.strategy.tips.li3_strong')}</strong>{t('manual.strategy.tips.li3_text')}</li>
                    <li><strong>{t('manual.strategy.tips.li4_strong')}</strong>{t('manual.strategy.tips.li4_text')}</li>
                </ul>
            </Section>

            <Section title={t('manual.errors.title')}>
                 <table className="w-full text-left text-sm border-collapse mt-2">
                    <thead className="bg-black/40 text-amber-100">
                        <tr>
                            <th className="border border-yellow-800/50 p-2">{t('manual.errors.table.h1')}</th>
                            <th className="border border-yellow-800/50 p-2">{t('manual.errors.table.h2')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-black/20">
                        <tr><td className="border p-2"><strong>{t('manual.errors.table.r1c1_strong')}</strong>{t('manual.errors.table.r1c1_text')}</td><td className="border p-2">{t('manual.errors.table.r1c2')}</td></tr>
                        <tr><td className="border p-2"><strong>{t('manual.errors.table.r2c1_strong')}</strong></td><td className="border p-2">{t('manual.errors.table.r2c2')}</td></tr>
                        <tr><td className="border p-2"><strong>{t('manual.errors.table.r3c1_strong')}</strong></td><td className="border p-2">{t('manual.errors.table.r3c2')}</td></tr>
                        <tr><td className="border p-2"><strong>{t('manual.errors.table.r4c1_strong')}</strong></td><td className="border p-2">{t('manual.errors.table.r4c2')}</td></tr>
                    </tbody>
                </table>
            </Section>

            <Section title={t('manual.glossary.title')}>
                 <h3 className="text-xl font-cinzel mt-4">{t('manual.glossary.variants.title')}</h3>
                 <ul>
                    <li><strong>{t('manual.glossary.variants.li1_strong')}</strong>{t('manual.glossary.variants.li1_text')}</li>
                    <li><strong>{t('manual.glossary.variants.li2_strong')}</strong>{t('manual.glossary.variants.li2_text')}</li>
                 </ul>
                 <h3 className="text-xl font-cinzel mt-4">{t('manual.glossary.glossary.title')}</h3>
                 <ul>
                    <li><strong>{t('manual.glossary.glossary.li1_strong')}</strong>{t('manual.glossary.glossary.li1_text')}</li>
                    <li><strong>{t('manual.glossary.glossary.li2_strong')}</strong>{t('manual.glossary.glossary.li2_text')}</li>
                    <li><strong>{t('manual.glossary.glossary.li3_strong')}</strong>{t('manual.glossary.glossary.li3_text')}</li>
                    <li><strong>{t('manual.glossary.glossary.li4_strong')}</strong>{t('manual.glossary.glossary.li4_text')}</li>
                 </ul>
            </Section>

        </div>
    </div>
  );
};

export default Manual;