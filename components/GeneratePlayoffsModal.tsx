import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Tournament } from '../types';

interface GeneratePlayoffsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament;
    onGenerated: () => void;
}

interface QualifiedTeam {
    team_id: number;
    name: string;
    logo_url: string;
    group_name: string;
    type: 'direct' | 'wildcard';
    rank_in_group?: number;
    original_group_name?: string;
}

interface ProposedMatch {
    bracket_index: number;
    stage: string;
    home_id: number | null;
    home_name: string;
    home_logo: string | null;
    away_id: number | null;
    away_name: string;
    away_logo: string | null;
}

const GeneratePlayoffsModal: React.FC<GeneratePlayoffsModalProps> = ({ isOpen, onClose, tournament, onGenerated }) => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [qualifiedTeams, setQualifiedTeams] = useState<QualifiedTeam[]>([]);
    const [defaultMatches, setDefaultMatches] = useState<ProposedMatch[]>([]);
    const [matches, setMatches] = useState<ProposedMatch[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchProposedPlayoffs();
        }
    }, [isOpen]);

    const fetchProposedPlayoffs = async () => {
        setFetching(true);
        setErrorMsg(null);
        try {
            const data = await apiService.getProposedPlayoffs(tournament.id);
            setQualifiedTeams(data.qualified_teams || []);
            setDefaultMatches(data.proposed_matches || []);
            setMatches(JSON.parse(JSON.stringify(data.proposed_matches || [])));
        } catch (error: any) {
            setErrorMsg(error.message || 'Error al obtener la propuesta de eliminatorias');
        } finally {
            setFetching(false);
        }
    };

    // Validar duplicados cada vez que cambien los partidos
    useEffect(() => {
        validatePairings();
    }, [matches]);

    const validatePairings = () => {
        const seen = new Set<number>();
        let hasDuplicates = false;

        for (const m of matches) {
            if (m.home_id !== null) {
                if (seen.has(m.home_id)) {
                    hasDuplicates = true;
                } else {
                    seen.add(m.home_id);
                }
            }
            if (m.away_id !== null) {
                if (seen.has(m.away_id)) {
                    hasDuplicates = true;
                } else {
                    seen.add(m.away_id);
                }
            }
        }

        if (hasDuplicates) {
            setErrorMsg('Error: Hay equipos seleccionados más de una vez en los cruces.');
        } else {
            setErrorMsg(null);
        }
    };

    const handleSelectTeam = (matchIndex: number, slot: 'home' | 'away', selectedIdStr: string) => {
        const nextMatches = [...matches];
        const selectedId = selectedIdStr === 'bye' ? null : Number(selectedIdStr);

        const team = qualifiedTeams.find(t => t.team_id === selectedId);

        if (slot === 'home') {
            nextMatches[matchIndex].home_id = selectedId;
            nextMatches[matchIndex].home_name = team ? team.name : 'BYE';
            nextMatches[matchIndex].home_logo = team ? team.logo_url : null;
        } else {
            nextMatches[matchIndex].away_id = selectedId;
            nextMatches[matchIndex].away_name = team ? team.name : 'BYE';
            nextMatches[matchIndex].away_logo = team ? team.logo_url : null;
        }

        setMatches(nextMatches);
    };

    const handleReset = () => {
        setMatches(JSON.parse(JSON.stringify(defaultMatches)));
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const payload = matches.map(m => ({
                bracket_index: m.bracket_index,
                home_id: m.home_id,
                away_id: m.away_id
            }));
            await apiService.generatePlayoffs(tournament.id, payload);
            onGenerated();
            onClose();
        } catch (error: any) {
            setErrorMsg(error.message || 'Error al generar las llaves de playoffs');
        } finally {
            setLoading(false);
        }
    };

    const primeros = qualifiedTeams.filter(t => t.rank_in_group === 1);
    const segundos = qualifiedTeams.filter(t => t.rank_in_group === 2);
    const tercerosComodinesYOtros = qualifiedTeams.filter(t => 
        t.rank_in_group === 3 || 
        t.type === 'wildcard' || 
        (t.rank_in_group !== undefined && t.rank_in_group > 3)
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-[#0d121f] border border-white/10 w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] rounded-sm">
                
                {/* Header */}
                <div className="p-8 border-b border-white/5 relative shrink-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#ffd900]"></div>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Generar Eliminatoria</h2>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                                Torneo Híbrido: Fase 2 (Playoffs) - {tournament.name}
                            </p>
                        </div>
                        <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    {fetching ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="size-12 border-4 border-white/5 border-t-[#ffd900] animate-spin rounded-full"></div>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">Calculando clasificados y cruces óptimos...</p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            
                            {/* Warning or Error Messages */}
                            {errorMsg && (
                                <div className={`p-4 border ${errorMsg.startsWith('Error:') ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-[#ffd900]/5 border-[#ffd900]/20 text-[#ffd900]'} flex items-start gap-3 rounded-sm`}>
                                    <span className="material-symbols-outlined shrink-0 text-xl">
                                        {errorMsg.startsWith('Error:') ? 'error' : 'info'}
                                    </span>
                                    <div className="text-xs font-bold uppercase tracking-wide leading-relaxed">
                                        {errorMsg}
                                    </div>
                                </div>
                            )}

                            {/* Panel de Clasificados por Posiciones */}
                            <div className="bg-[#121926]/40 border border-white/5 p-6 space-y-6 rounded-sm">
                                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#ffd900] text-lg">emoji_events</span>
                                    Equipos Clasificados de la Fase de Grupos
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Primeros */}
                                    {primeros.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                                                <span className="flex items-center justify-center size-5 bg-[#ffd900]/10 text-[#ffd900] text-[10px] font-black rounded-full border border-[#ffd900]/20">1º</span>
                                                <h4 className="text-[10px] font-black text-white/60 uppercase tracking-widest">Primeros de Grupo</h4>
                                            </div>
                                            <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                                                {primeros.map(t => (
                                                    <div key={t.team_id} className="flex items-center gap-2.5 p-2 bg-white/5 border border-white/5 rounded-sm hover:bg-white/10 transition-colors">
                                                        {t.logo_url ? (
                                                            <img src={apiService.resolveImageUrl(t.logo_url)} className="size-5 object-contain shrink-0" alt="" />
                                                        ) : (
                                                            <div className="size-5 bg-white/10 rounded-full shrink-0 flex items-center justify-center text-[8px] font-black text-white/40">T</div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] font-bold text-white truncate uppercase">{t.name}</p>
                                                            <p className="text-[8px] font-semibold text-white/30 uppercase tracking-tight">Grupo {t.original_group_name || t.group_name}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Segundos */}
                                    {segundos.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                                                <span className="flex items-center justify-center size-5 bg-white/10 text-white/70 text-[10px] font-black rounded-full border border-white/20">2º</span>
                                                <h4 className="text-[10px] font-black text-white/60 uppercase tracking-widest">Segundos de Grupo</h4>
                                            </div>
                                            <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                                                {segundos.map(t => (
                                                    <div key={t.team_id} className="flex items-center gap-2.5 p-2 bg-white/5 border border-white/5 rounded-sm hover:bg-white/10 transition-colors">
                                                        {t.logo_url ? (
                                                            <img src={apiService.resolveImageUrl(t.logo_url)} className="size-5 object-contain shrink-0" alt="" />
                                                        ) : (
                                                            <div className="size-5 bg-white/10 rounded-full shrink-0 flex items-center justify-center text-[8px] font-black text-white/40">T</div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] font-bold text-white truncate uppercase">{t.name}</p>
                                                            <p className="text-[8px] font-semibold text-white/30 uppercase tracking-tight">Grupo {t.original_group_name || t.group_name}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Terceros, Comodines y Otros */}
                                    {tercerosComodinesYOtros.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                                                <span className="flex items-center justify-center size-5 bg-[#b25e24]/20 text-[#e67e22] text-[10px] font-black rounded-full border border-[#b25e24]/30">3º</span>
                                                <h4 className="text-[10px] font-black text-white/60 uppercase tracking-widest">Terceros / Comodines</h4>
                                            </div>
                                            <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                                                {tercerosComodinesYOtros.map(t => (
                                                    <div key={t.team_id} className="flex items-center gap-2.5 p-2 bg-white/5 border border-white/5 rounded-sm hover:bg-white/10 transition-colors">
                                                        {t.logo_url ? (
                                                            <img src={apiService.resolveImageUrl(t.logo_url)} className="size-5 object-contain shrink-0" alt="" />
                                                        ) : (
                                                            <div className="size-5 bg-white/10 rounded-full shrink-0 flex items-center justify-center text-[8px] font-black text-white/40">T</div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] font-bold text-white truncate uppercase">{t.name}</p>
                                                            <p className="text-[8px] font-semibold text-white/30 uppercase tracking-tight">
                                                                Grupo {t.original_group_name || t.group_name} {t.type === 'wildcard' ? '(COMODÍN)' : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info card */}
                            <div className="bg-white/5 border border-white/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-sm">
                                <div>
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Resumen de Clasificados</h4>
                                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">
                                        Total clasificados: {qualifiedTeams.length} equipos
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleReset}
                                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all rounded-sm flex items-center gap-1.5"
                                        title="Restaurar a la propuesta óptima generada por el sistema"
                                    >
                                        <span className="material-symbols-outlined text-sm">settings_backup_restore</span>
                                        Restaurar Propuesta
                                    </button>
                                </div>
                            </div>

                            {/* Matches Editor Grid */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-black text-[#ffd900] uppercase italic tracking-tighter border-b border-white/5 pb-2">
                                    Definición de Llaves (Primera Ronda)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {matches.map((m, idx) => (
                                        <div key={idx} className="bg-[#121926]/40 border border-white/5 p-5 rounded-sm relative group hover:border-white/15 transition-all">
                                            
                                            {/* Match Header */}
                                            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                                                <span className="text-[9px] font-black text-[#ffd900] uppercase tracking-widest">
                                                    Llave #{idx + 1}
                                                </span>
                                                <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
                                                    {m.stage}
                                                </span>
                                            </div>

                                            {/* Teams selectors */}
                                            <div className="space-y-4">
                                                {/* Local / Home */}
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-white/40 uppercase tracking-wider block">
                                                        Local / Cabeza de Serie
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        {m.home_logo && (
                                                            <div className="size-8 flex items-center justify-center p-1.5 bg-black/40 border border-white/5 rounded-sm shrink-0">
                                                                <img src={apiService.resolveImageUrl(m.home_logo)} className="size-5 object-contain" alt="" />
                                                            </div>
                                                        )}
                                                        <select
                                                            value={m.home_id !== null ? m.home_id : 'bye'}
                                                            onChange={(e) => handleSelectTeam(idx, 'home', e.target.value)}
                                                            className="flex-1 bg-black/40 border border-white/10 focus:border-[#ffd900] text-xs text-white p-2.5 font-bold uppercase tracking-tight rounded-sm outline-none cursor-pointer"
                                                        >
                                                            <option value="bye">BYE / LIBRE</option>
                                                            {qualifiedTeams.map(t => {
                                                                const rankStr = t.rank_in_group ? `${t.rank_in_group}º ` : '';
                                                                const groupStr = t.type === 'wildcard' ? 'COMODÍN' : `GRUPO ${t.original_group_name || t.group_name}`;
                                                                return (
                                                                    <option key={t.team_id} value={t.team_id}>
                                                                        {t.name} ({rankStr}{groupStr})
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* VS Separator */}
                                                <div className="flex items-center justify-center">
                                                    <div className="h-[1px] flex-1 bg-white/5"></div>
                                                    <span className="px-3 text-[9px] font-black text-[#ffd900] uppercase italic">VS</span>
                                                    <div className="h-[1px] flex-1 bg-white/5"></div>
                                                </div>

                                                {/* Away / Visitor */}
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-white/40 uppercase tracking-wider block">
                                                        Visitante / Rival
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        {m.away_logo && (
                                                            <div className="size-8 flex items-center justify-center p-1.5 bg-black/40 border border-white/5 rounded-sm shrink-0">
                                                                <img src={apiService.resolveImageUrl(m.away_logo)} className="size-5 object-contain" alt="" />
                                                            </div>
                                                        )}
                                                        <select
                                                            value={m.away_id !== null ? m.away_id : 'bye'}
                                                            onChange={(e) => handleSelectTeam(idx, 'away', e.target.value)}
                                                            className="flex-1 bg-black/40 border border-white/10 focus:border-[#ffd900] text-xs text-white p-2.5 font-bold uppercase tracking-tight rounded-sm outline-none cursor-pointer"
                                                        >
                                                            <option value="bye">BYE / LIBRE</option>
                                                            {qualifiedTeams.map(t => {
                                                                const rankStr = t.rank_in_group ? `${t.rank_in_group}º ` : '';
                                                                const groupStr = t.type === 'wildcard' ? 'COMODÍN' : `GRUPO ${t.original_group_name || t.group_name}`;
                                                                return (
                                                                    <option key={t.team_id} value={t.team_id}>
                                                                        {t.name} ({rankStr}{groupStr})
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex gap-4 pt-6 border-t border-white/5">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all rounded-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading || errorMsg !== null}
                                    className={`flex-[2] py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 rounded-sm ${
                                        loading || errorMsg !== null
                                            ? 'bg-white/10 text-white/10 cursor-not-allowed border border-white/5'
                                            : 'bg-[#ffd900] text-black hover:scale-[1.02] shadow-[0_0_30px_rgba(255,217,0,0.15)]'
                                    }`}
                                >
                                    {loading ? (
                                        <div className="size-4 border-2 border-black/20 border-t-black animate-spin rounded-full"></div>
                                    ) : (
                                        <span className="material-symbols-outlined text-lg">bolt</span>
                                    )}
                                    Generar Llaves Finales
                                </button>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeneratePlayoffsModal;
