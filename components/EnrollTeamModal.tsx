import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Team } from '../types';

interface EnrollTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournamentId: string;
    onEnrolled: () => void;
}

const EnrollTeamModal: React.FC<EnrollTeamModalProps> = ({ isOpen, onClose, tournamentId, onEnrolled }) => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [enrolledTeamIds, setEnrolledTeamIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchTeams();
        }
    }, [isOpen]);

    const fetchTeams = async () => {
        setLoading(true);
        try {
            const [allTeams, tournamentData] = await Promise.all([
                apiService.getTeams(false, true),
                apiService.getTournamentDetail(tournamentId)
            ]);

            setTeams(allTeams);

            if (tournamentData && tournamentData.participants) {
                const ids = new Set(tournamentData.participants.map((p: any) => p.team_id));
                setEnrolledTeamIds(ids);
            }
        } catch (error) {
            console.error('Error fetching teams or tournament details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (teamId: string) => {
        if (submitting) return;
        setSubmitting(true);
        try {
            await apiService.enrollTournament({
                tournament_id: tournamentId,
                team_id: teamId
            });
            onEnrolled();
            onClose();
        } catch (error: any) {
            alert(error.message || 'Error al inscribir el equipo');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const filteredTeams = teams.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.short_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-[#0d121f] border border-white/10 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#ffd900]"></div>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Inscribir Equipo</h2>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Selecciona un equipo de la base de datos global</p>
                        </div>
                        <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="p-8 bg-black/20 flex flex-col gap-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="BUSCAR EQUIPO..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 p-4 pl-12 text-[10px] font-bold text-white uppercase tracking-widest focus:outline-none focus:border-[#ffd900] transition-all"
                        />
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20">search</span>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[400px]">
                        {loading ? (
                            <div className="py-20 text-center">
                                <div className="size-10 border-4 border-[#ffd900]/20 border-t-[#ffd900] rounded-full animate-spin mx-auto mb-4"></div>
                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Cargando base de datos...</span>
                            </div>
                        ) : filteredTeams.length === 0 ? (
                            <div className="py-20 text-center border-2 border-dashed border-white/5">
                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">No se encontraron equipos</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredTeams.map((team) => {
                                    const isEnrolled = enrolledTeamIds.has(team.id);
                                    return (
                                        <div key={team.id} className={`p-4 bg-white/5 border border-white/10 flex items-center justify-between group transition-all ${isEnrolled ? 'opacity-30 grayscale pointer-events-none' : 'hover:border-[#ffd900]/30'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 bg-black/40 p-1.5 flex items-center justify-center">
                                                    {team.logo_url ? <img src={apiService.resolveImageUrl(team.logo_url)} className="w-full h-full object-contain" /> : <span className="material-symbols-outlined text-white/10">shield</span>}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-white uppercase tracking-tighter truncate max-w-[120px]">{team.name}</div>
                                                    <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                                                        {isEnrolled ? 'YA INSCRITO' : team.short_name}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleEnroll(team.id)}
                                                disabled={submitting || isEnrolled}
                                                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-transform ${isEnrolled
                                                        ? 'bg-white/10 text-white/40'
                                                        : 'bg-[#ffd900] text-black hover:scale-105'
                                                    } disabled:opacity-50`}
                                            >
                                                {isEnrolled ? 'INSCRITO' : 'Inscribir'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnrollTeamModal;
