import React, { useState } from 'react';
import { apiService } from '../services/api';
import { Tournament } from '../types';

interface HybridSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament;
    participants: any[];
    onStarted: () => void;
}

const HybridSetupModal: React.FC<HybridSetupModalProps> = ({ isOpen, onClose, tournament, participants, onStarted }) => {
    const [loading, setLoading] = useState(false);
    const [numGroups, setNumGroups] = useState(2);
    const [qualifiersPerGroup, setQualifiersPerGroup] = useState(2);
    const [bestWildcards, setBestWildcards] = useState(0);
    const [seedingMethod, setSeedingMethod] = useState<'random' | 'ranking' | 'elo' | 'manual'>('random');
    const [step, setStep] = useState(1);
    const [customGroups, setCustomGroups] = useState<{ [key: string]: any[] }>({});
    const [availableTeams, setAvailableTeams] = useState<any[]>([]);

    if (!isOpen) return null;

    const initializeManualStep = () => {
        const initialGroups: { [key: string]: any[] } = {};
        for (let i = 0; i < numGroups; i++) {
            initialGroups[String.fromCharCode(65 + i)] = [];
        }
        setCustomGroups(initialGroups);
        setAvailableTeams([...participants]);
        setStep(2);
    };

    const handleStart = async () => {
        setLoading(true);
        try {
            const seedingParams: any = {
                num_groups: numGroups,
                qualifiers_per_group: qualifiersPerGroup,
                best_wildcards: bestWildcards
            };

            if (seedingMethod === 'manual') {
                const groupsPayload: { [key: string]: number[] } = {};
                Object.entries(customGroups).forEach(([name, teams]) => {
                    groupsPayload[name] = (teams as any[]).map(t => t.team_id);
                });
                seedingParams.custom_groups = groupsPayload;
            }

            await apiService.startTournament(tournament.id, seedingMethod, seedingParams);
            onStarted();
            onClose();
        } catch (error: any) {
            alert(error.message || 'Error al iniciar el torneo híbrido');
        } finally {
            setLoading(false);
        }
    };

    // Drag and Drop handlers
    const onDragStart = (e: React.DragEvent, team: any, fromGroup: string | null) => {
        e.dataTransfer.setData('teamId', team.team_id.toString());
        e.dataTransfer.setData('fromGroup', fromGroup || 'available');
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const onDrop = (e: React.DragEvent, toGroup: string | null) => {
        e.preventDefault();
        const teamId = e.dataTransfer.getData('teamId');
        const fromGroup = e.dataTransfer.getData('fromGroup');

        if (fromGroup === (toGroup || 'available')) return;

        let teamToMove: any = null;

        // Quitar de origen
        if (fromGroup === 'available') {
            teamToMove = availableTeams.find(t => String(t.team_id) === teamId);
            if (teamToMove) {
                setAvailableTeams(prev => prev.filter(t => String(t.team_id) !== teamId));
            }
        } else {
            teamToMove = customGroups[fromGroup]?.find(t => String(t.team_id) === teamId);
            if (teamToMove) {
                setCustomGroups(prev => ({
                    ...prev,
                    [fromGroup]: prev[fromGroup].filter(t => String(t.team_id) !== teamId)
                }));
            }
        }

        // Agregar a destino
        if (teamToMove) {
            if (toGroup === null) {
                setAvailableTeams(prev => [...prev, teamToMove]);
            } else {
                setCustomGroups(prev => ({
                    ...prev,
                    [toGroup]: [...(prev[toGroup] || []), teamToMove]
                }));
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-[#0d121f] border border-white/10 w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 relative shrink-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#ffd900]"></div>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Configuración de Grupos</h2>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Torneo Híbrido: Fase 1</p>
                        </div>
                        <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    {step === 1 ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-xl mx-auto">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">Número de Grupos</label>
                                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4">
                                        <button onClick={() => setNumGroups(Math.max(1, numGroups - 1))} className="text-[#ffd900] hover:scale-125 transition-transform">
                                            <span className="material-symbols-outlined">remove_circle</span>
                                        </button>
                                        <span className="flex-1 text-center text-2xl font-black text-white italic">{numGroups}</span>
                                        <button onClick={() => setNumGroups(numGroups + 1)} className="text-[#ffd900] hover:scale-125 transition-transform">
                                            <span className="material-symbols-outlined">add_circle</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">Clasifican por grupo</label>
                                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4">
                                        <button onClick={() => setQualifiersPerGroup(Math.max(1, qualifiersPerGroup - 1))} className="text-[#ffd900] hover:scale-125 transition-transform">
                                            <span className="material-symbols-outlined">remove_circle</span>
                                        </button>
                                        <span className="flex-1 text-center text-2xl font-black text-white italic">{qualifiersPerGroup}</span>
                                        <button onClick={() => setQualifiersPerGroup(qualifiersPerGroup + 1)} className="text-[#ffd900] hover:scale-125 transition-transform">
                                            <span className="material-symbols-outlined">add_circle</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">Mejores Wildcard Adicionales (Ej: Mejores Terceros)</label>
                                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 max-w-sm">
                                    <button onClick={() => setBestWildcards(Math.max(0, bestWildcards - 1))} className="text-[#ffd900] hover:scale-125 transition-transform">
                                        <span className="material-symbols-outlined">remove_circle</span>
                                    </button>
                                    <span className="flex-1 text-center text-2xl font-black text-white italic">{bestWildcards}</span>
                                    <button onClick={() => setBestWildcards(bestWildcards + 1)} className="text-[#ffd900] hover:scale-125 transition-transform">
                                        <span className="material-symbols-outlined">add_circle</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">Método de Sorteo</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'random', label: 'Aleatorio', icon: 'casino' },
                                        { id: 'ranking', label: 'Ránking (Serpiente)', icon: 'trending_up' },
                                        { id: 'manual', label: 'Manual', icon: 'edit' }
                                    ].map(method => (
                                        <button
                                            key={method.id}
                                            onClick={() => setSeedingMethod(method.id as any)}
                                            className={`flex flex-col items-center gap-2 p-4 border transition-all ${seedingMethod === method.id
                                                ? 'bg-[#ffd900] border-[#ffd900] text-black shadow-[0_0_20px_rgba(255,217,0,0.1)]'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                                        >
                                            <span className="material-symbols-outlined text-xl">{method.icon}</span>
                                            <span className="text-[9px] font-black uppercase">{method.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => seedingMethod === 'manual' ? initializeManualStep() : setStep(2)}
                                className="w-full py-5 bg-[#ffd900] text-black font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(255,217,0,0.2)] flex items-center justify-center gap-3"
                            >
                                Siguiente Paso
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    ) : seedingMethod === 'manual' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex flex-col md:flex-row gap-8">
                                {/* Columna de Equipos Disponibles */}
                                <div className="w-full md:w-1/3 space-y-4">
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Equipos Disponibles ({availableTeams.length})</h4>
                                    <div
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, null)}
                                        className="bg-white/5 border border-dashed border-white/10 p-4 min-h-[400px] flex flex-col gap-2 rounded-sm"
                                    >
                                        {availableTeams.map(team => (
                                            <div
                                                key={team.team_id}
                                                draggable
                                                onDragStart={(e) => onDragStart(e, team, null)}
                                                className="bg-[#1a2235] border border-white/5 p-3 flex items-center gap-3 cursor-move hover:border-[#ffd900]/50 transition-all group"
                                            >
                                                <img src={apiService.resolveImageUrl(team.team_logo)} className="size-6 object-contain" alt="" />
                                                <span className="text-[10px] font-black text-white uppercase truncate">{team.team_name}</span>
                                            </div>
                                        ))}
                                        {availableTeams.length === 0 && (
                                            <p className="text-[9px] text-white/10 text-center mt-10 italic">Todos los equipos asignados</p>
                                        )}
                                    </div>
                                </div>

                                {/* Contenedores de Grupos */}
                                <div className="flex-1 space-y-4">
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Distribución de Grupos</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {Object.entries(customGroups).map(([groupName, teams]: [string, any[]]) => (
                                            <div
                                                key={groupName}
                                                onDragOver={onDragOver}
                                                onDrop={(e) => onDrop(e, groupName)}
                                                className="bg-white/5 border border-white/10 p-4 min-h-[180px] rounded-sm flex flex-col gap-2"
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <h5 className="text-[11px] font-black text-[#ffd900] uppercase italic">Grupo {groupName}</h5>
                                                    <span className="text-[9px] font-bold text-white/20 uppercase">{teams.length} equipos</span>
                                                </div>
                                                {teams.map(team => (
                                                    <div
                                                        key={team.team_id}
                                                        draggable
                                                        onDragStart={(e) => onDragStart(e, team, groupName)}
                                                        className="bg-[#1a2235]/60 border border-white/5 p-2 flex items-center gap-2 cursor-move hover:border-[#ffd900] transition-all"
                                                    >
                                                        <img src={apiService.resolveImageUrl(team.team_logo)} className="size-5 object-contain" alt="" />
                                                        <span className="text-[9px] font-black text-white uppercase truncate">{team.team_name}</span>
                                                    </div>
                                                ))}
                                                {teams.length === 0 && (
                                                    <div className="flex-1 flex items-center justify-center border border-dashed border-white/5 opacity-20">
                                                        <span className="text-[8px] font-bold uppercase tracking-widest text-center">Arrastra aquí</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-white/5">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-4 border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all uppercase"
                                >
                                    Atrás
                                </button>
                                <button
                                    onClick={handleStart}
                                    disabled={loading || availableTeams.length > 0}
                                    className={`flex-[2] py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${loading || availableTeams.length > 0
                                        ? 'bg-white/10 text-white/10 cursor-not-allowed'
                                        : 'bg-[#ffd900] text-black hover:scale-[1.02] shadow-[0_0_30px_rgba(255,217,0,0.15)]'
                                        }`}
                                >
                                    {loading ? (
                                        <div className="size-4 border-2 border-black/20 border-t-black animate-spin rounded-full"></div>
                                    ) : (
                                        <span className="material-symbols-outlined text-lg">bolt</span>
                                    )}
                                    {availableTeams.length > 0 ? `Asigna los ${availableTeams.length} equipos restantes` : 'Confirmar e Iniciar'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300 max-w-xl mx-auto">
                            <div className="bg-[#ffd900]/5 border border-[#ffd900]/20 p-6 space-y-4">
                                <h4 className="text-[10px] font-black text-[#ffd900] uppercase tracking-widest">Resumen de Fase de Grupos</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[8px] text-white/40 uppercase font-bold">Grupos</p>
                                        <p className="text-sm font-black text-white uppercase italic">{numGroups} grupos de {Math.ceil(((tournament as any).participants?.length || 0) / numGroups)} equipos*</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] text-white/40 uppercase font-bold">Clasificación</p>
                                        <p className="text-sm font-black text-white uppercase italic">{(numGroups * qualifiersPerGroup) + bestWildcards} avanzan a Fase Final</p>
                                        {(bestWildcards > 0) && <p className="text-[9px] text-white/60">Top {qualifiersPerGroup} por grupo + Top {bestWildcards} tabla general</p>}
                                    </div>
                                </div>
                                <p className="text-[8px] text-white/20 uppercase font-bold italic">* Algunos grupos podrían tener un equipo menos para ajustar el total.</p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-4 border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all uppercase"
                                >
                                    Atrás
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
                                    Confirmar e Iniciar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HybridSetupModal;
