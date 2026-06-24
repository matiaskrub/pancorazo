import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Tournament } from '../types';

interface ManualBracketModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament;
    participants: any[];
    onStarted: () => void;
}

const ManualBracketModal: React.FC<ManualBracketModalProps> = ({ isOpen, onClose, tournament, participants, onStarted }) => {
    const [loading, setLoading] = useState(false);
    const [availableTeams, setAvailableTeams] = useState<any[]>([]);
    const [slots, setSlots] = useState<{ [key: string]: any | null }>({});
    const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const count = participants.length;
            let pow2 = 1;
            while (pow2 < count) pow2 *= 2;

            const initialSlots: { [key: string]: any | null } = {};
            for (let i = 0; i < pow2; i++) {
                initialSlots[`slot_${i}`] = null;
            }
            setSlots(initialSlots);
            setAvailableTeams([...participants]);
        }
    }, [isOpen, participants]);

    if (!isOpen) return null;

    const onDragStart = (e: React.DragEvent, team: any, fromSlot: string | null) => {
        e.dataTransfer.setData('teamId', team.team_id.toString());
        e.dataTransfer.setData('fromSlot', fromSlot || 'available');
    };

    const onDragOver = (e: React.DragEvent, slotId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverSlot(slotId);
    };

    const onDragLeave = () => {
        setDragOverSlot(null);
    };

    const onDrop = (e: React.DragEvent, toSlot: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverSlot(null);

        const teamIdStr = e.dataTransfer.getData('teamId');
        const fromSlot = e.dataTransfer.getData('fromSlot');

        if (!teamIdStr) return;
        const teamId = teamIdStr; // Mantener como string para consistencia con los datos del evento

        if (fromSlot === (toSlot || 'available')) return;

        let team: any;
        // Quitar de origen
        if (fromSlot === 'available') {
            team = availableTeams.find(t => String(t.team_id) === teamId);
            setAvailableTeams(availableTeams.filter(t => String(t.team_id) !== teamId));
        } else {
            team = slots[fromSlot];
            setSlots(prev => ({ ...prev, [fromSlot]: null }));
        }

        // Agregar a destino
        if (toSlot === null) {
            setAvailableTeams(prev => [...prev, team]);
        } else {
            // Si el slot de destino ya tiene alguien, devolverlo a disponibles
            const existingTeam = slots[toSlot];
            if (existingTeam) {
                setAvailableTeams(prev => [...prev, existingTeam]);
            }
            setSlots(prev => ({ ...prev, [toSlot]: team }));
        }
    };

    const handleSaveBracket = async () => {
        setLoading(true);
        try {
            const matches: any[] = [];
            const slotKeys = Object.keys(slots).sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

            // Determinar nombres de etapa
            const stages: { [key: number]: string } = {
                1: 'Final',
                2: 'Semifinales',
                4: 'Cuartos de Final',
                8: 'Octavos de Final',
                16: 'Dieciseisavos de Final',
                32: 'Treintaidosavos de Final'
            };

            const currentStageCount = slotKeys.length / 2;
            const stageName = stages[currentStageCount] || `Ronda de ${currentStageCount}`;

            for (let i = 0; i < slotKeys.length; i += 2) {
                const home = slots[slotKeys[i]];
                const away = slots[slotKeys[i + 1]];
                const bracketIndex = i / 2;

                if (home && away) {
                    matches.push({ home_id: home.team_id, away_id: away.team_id, round: 1, stage: stageName, bracket_index: bracketIndex });
                } else if (home || away) {
                    if (home) matches.push({ home_id: home.team_id, away_id: null, round: 1, stage: stageName, bracket_index: bracketIndex });
                    else matches.push({ home_id: null, away_id: away.team_id, round: 1, stage: stageName, bracket_index: bracketIndex });
                }
            }

            await apiService.startTournament(tournament.id, 'manual', { matches });
            onStarted();
            onClose();
        } catch (error: any) {
            alert(error.message || 'Error al guardar el bracket');
        } finally {
            setLoading(false);
        }
    };

    const stagesDict: { [key: number]: string } = {
        1: 'Final',
        2: 'Semifinales',
        4: 'Cuartos de Final',
        8: 'Octavos de Final',
        16: 'Dieciseisavos de Final',
        32: 'Treintaidosavos de Final'
    };
    const currentStageCount = Object.keys(slots).length / 2;
    const stageName = stagesDict[currentStageCount] || `Ronda de ${currentStageCount}`;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-[#0d121f] border border-white/10 w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 relative shrink-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#ffd900]"></div>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Posicionamiento Manual Bracket</h2>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Copa: {stageName}</p>
                        </div>
                        <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Lista de Equipos */}
                    <div className="col-span-1 space-y-4">
                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Equipos ({availableTeams.length})</h4>
                        <div
                            onDragOver={(e) => onDragOver(e, 'available')}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => onDrop(e, null)}
                            className={`bg-white/5 border border-dashed p-4 min-h-[400px] flex flex-col gap-2 rounded-sm transition-colors ${dragOverSlot === 'available' ? 'border-[#ffd900] bg-[#ffd900]/5' : 'border-white/10'}`}
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
                        </div>
                    </div>

                    {/* Bracket Layout Simplificado ({stageName}) */}
                    <div className="col-span-3 space-y-6">
                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Bracket Inicial ({stageName})</h4>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                            {Object.keys(slots).filter((_, i) => i % 2 === 0).map((key, i) => {
                                const homeKey = `slot_${i * 2}`;
                                const awayKey = `slot_${i * 2 + 1}`;
                                return (
                                    <div key={i} className="space-y-1">
                                        <p className="text-[8px] font-black text-[#ffd900]/40 uppercase tracking-widest mb-2 italic">Partido {i + 1}</p>

                                        {/* Slot Local */}
                                        <div
                                            onDragOver={(e) => onDragOver(e, homeKey)}
                                            onDragLeave={onDragLeave}
                                            onDrop={(e) => onDrop(e, homeKey)}
                                            className={`p-3 border flex items-center gap-3 min-h-[50px] transition-all ${slots[homeKey] ? 'bg-[#1a2235] border-white/10' : 'bg-white/5 border-dashed border-white/5 opacity-50'} ${dragOverSlot === homeKey ? 'border-[#ffd900] bg-[#ffd900]/10 scale-[1.02]' : ''}`}
                                        >
                                            {slots[homeKey] ? (
                                                <>
                                                    <div draggable onDragStart={(e) => onDragStart(e, slots[homeKey], homeKey)} className="flex items-center gap-3 cursor-move w-full">
                                                        <img src={apiService.resolveImageUrl(slots[homeKey].team_logo)} className="size-6 object-contain" alt="" />
                                                        <span className="text-[10px] font-black text-white uppercase truncate">{slots[homeKey].team_name}</span>
                                                    </div>
                                                </>
                                            ) : <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">Slot Local</span>}
                                        </div>

                                        {/* Divisor Visual */}
                                        <div className="h-[2px] bg-white/5 relative">
                                            <div className="absolute left-0 top-0 h-full w-1 bg-[#ffd900]"></div>
                                        </div>

                                        {/* Slot Visita */}
                                        <div
                                            onDragOver={(e) => onDragOver(e, awayKey)}
                                            onDragLeave={onDragLeave}
                                            onDrop={(e) => onDrop(e, awayKey)}
                                            className={`p-3 border flex items-center gap-3 min-h-[50px] transition-all ${slots[awayKey] ? 'bg-[#1a2235] border-white/10' : 'bg-white/5 border-dashed border-white/5 opacity-50'} ${dragOverSlot === awayKey ? 'border-[#ffd900] bg-[#ffd900]/10 scale-[1.02]' : ''}`}
                                        >
                                            {slots[awayKey] ? (
                                                <>
                                                    <div draggable onDragStart={(e) => onDragStart(e, slots[awayKey], awayKey)} className="flex items-center gap-3 cursor-move w-full">
                                                        <img src={apiService.resolveImageUrl(slots[awayKey].team_logo)} className="size-6 object-contain" alt="" />
                                                        <span className="text-[10px] font-black text-white uppercase truncate">{slots[awayKey].team_name}</span>
                                                    </div>
                                                </>
                                            ) : <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">Slot Visita</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-black/20 shrink-0 flex justify-end gap-4">
                    <button onClick={onClose} className="px-8 py-4 border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all uppercase">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveBracket}
                        disabled={loading || availableTeams.length > 0}
                        className={`px-10 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${loading || availableTeams.length > 0
                            ? 'bg-white/5 text-white/10 cursor-not-allowed'
                            : 'bg-[#ffd900] text-black hover:scale-105 shadow-[0_0_30px_rgba(255,217,0,0.15)]'
                            }`}
                    >
                        {loading ? <div className="size-4 border-2 border-black/20 border-t-black animate-spin rounded-full"></div> : <span className="material-symbols-outlined text-lg">bolt</span>}
                        {availableTeams.length > 0 ? `Ubica los ${availableTeams.length} equipos restantes` : 'Confirmar e Iniciar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualBracketModal;
