import React, { useState } from 'react';
import { apiService } from '../services/api';
import { Tournament } from '../types';

interface StartTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament;
    onStarted: () => void;
    onManualSelect?: () => void;
}

const StartTournamentModal: React.FC<StartTournamentModalProps> = ({ isOpen, onClose, tournament, onStarted, onManualSelect }) => {
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [seedingMethod, setSeedingMethod] = useState<'random' | 'manual' | 'ranking' | 'elo' | null>(null);

    if (!isOpen) return null;

    const handleStart = async () => {
        if (!seedingMethod) {
            alert('Por favor selecciona un método de siembra/generación');
            return;
        }
        if (seedingMethod === 'manual' && onManualSelect) {
            onManualSelect();
            onClose();
            return;
        }

        setLoading(true);
        try {
            await apiService.startTournament(tournament.id, seedingMethod);
            onStarted();
            onClose();
        } catch (error: any) {
            alert(error.message || 'Error al iniciar el torneo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-[#0d121f] border border-white/10 w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#ffd900]"></div>
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Iniciar Torneo</h2>
                        <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-[#ffd900]/5 border border-[#ffd900]/20 p-5 space-y-4">
                        <div className="flex items-center gap-3 text-[#ffd900] mb-2">
                            <span className="material-symbols-outlined text-sm">settings_suggest</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Configuración de Fixture</span>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">¿Cómo deseas organizar los equipos?</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'random', label: 'Sorteo Aleatorio', icon: 'casino', desc: 'Orden al azar' },
                                    { id: 'ranking', label: 'Por Ránking', icon: 'trending_up', desc: 'Puntos oficiales' },
                                    { id: 'manual', label: 'Orden Manual', icon: 'edit', desc: 'Orden de registro' }
                                ].map(method => (
                                    <button
                                        key={method.id}
                                        onClick={() => setSeedingMethod(method.id as any)}
                                        className={`flex flex-col items-center gap-2 p-4 border transition-all text-center group ${seedingMethod === method.id
                                            ? 'bg-[#ffd900] border-[#ffd900] text-black shadow-[0_0_20px_rgba(255,217,0,0.2)]'
                                            : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'}`}
                                    >
                                        <span className={`material-symbols-outlined text-xl ${seedingMethod === method.id ? 'text-black' : 'text-[#ffd900]'}`}>{method.icon}</span>
                                        <div className="space-y-0.5">
                                            <span className="text-[9px] font-black uppercase block">{method.label}</span>
                                            <span className={`text-[7px] font-bold uppercase tracking-tighter block opacity-60`}>{method.desc}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 px-2">
                        <div className="flex justify-between text-[10px] font-bold text-white uppercase tracking-widest border-b border-white/5 pb-2">
                            <span className="text-white/40">Estructura</span>
                            <span className="text-[#ffd900] font-black uppercase tracking-tighter italic">{tournament.structure}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-white uppercase tracking-widest border-b border-white/5 pb-2">
                            <span className="text-white/40">Formato</span>
                            <span className="uppercase">{tournament.match_format === 'home_away' ? 'Ida y Vuelta' : 'Partido Único'}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-white uppercase tracking-widest border-b border-white/5 pb-2">
                            <span className="text-white/40">Participantes</span>
                            <span>{(tournament as any).participants?.length || 0} Equipos</span>
                        </div>
                    </div>

                    {!confirming ? (
                        <button
                            onClick={() => {
                                if (!seedingMethod) {
                                    alert('Por favor selecciona un método de organización');
                                    return;
                                }
                                setConfirming(true);
                            }}
                            className={`w-full py-5 font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${!seedingMethod
                                ? 'bg-white/5 text-white/10 cursor-not-allowed'
                                : 'bg-[#ffd900] text-black hover:scale-[1.02] shadow-[0_0_30px_rgba(255,217,0,0.15)]'}`}
                        >
                            <span className="material-symbols-outlined text-lg">auto_awesome</span>
                            Generar Fixture
                        </button>
                    ) : (
                        <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-red-500/10 border border-red-500/20 p-4 text-center">
                                <p className="text-[10px] font-black text-white uppercase tracking-widest">¿Estás seguro?</p>
                                <p className="text-[9px] text-white/40 uppercase mt-1">Se crearán los partidos y se cerrarán inscripciones</p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setConfirming(false)}
                                    className="flex-1 py-4 border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all"
                                >
                                    Volver
                                </button>
                                <button
                                    onClick={handleStart}
                                    disabled={loading}
                                    className="flex-[2] py-4 bg-[#ffd900] text-black font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(255,217,0,0.15)] flex items-center justify-center gap-3"
                                >
                                    {loading ? (
                                        <div className="size-4 border-2 border-black/20 border-t-black animate-spin rounded-full"></div>
                                    ) : (
                                        <span className="material-symbols-outlined text-lg">bolt</span>
                                    )}
                                    Confirmar y Empezar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StartTournamentModal;
