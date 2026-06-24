import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { apiService } from '../services/api';
import { formatLocalDateTime } from '../utils/formatters';

interface MatchDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: any;
    onEdit?: () => void;
}

const MatchDetailsModal: React.FC<MatchDetailsModalProps> = ({ isOpen, onClose, match, onEdit }) => {
    if (!isOpen || !match) return null;

    const savedUser = localStorage.getItem('user');
    const currentUser: User | null = savedUser ? JSON.parse(savedUser) : null;
    const canEdit = currentUser?.global_role === 'SUPER_ADMIN' || currentUser?.global_role === 'ADMIN' || currentUser?.global_role === 'EDITOR';

    const isPending = match.status === 'PENDING';
    const isWO = match.status === 'WALKOVER';

    // Group events by team
    const homeEvents = match.events?.filter((e: any) => e.team_id === match.team_home_id) || [];
    const awayEvents = match.events?.filter((e: any) => e.team_id === match.team_away_id) || [];

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'YELLOW_CARD': return <span className="size-5 bg-yellow-400 rounded-sm inline-block shadow-[0_0_15px_rgba(250,204,21,0.6)]"></span>;
            case 'RED_CARD': return <span className="size-5 bg-red-600 rounded-sm inline-block shadow-[0_0_15px_rgba(220,38,38,0.6)]"></span>;
            case 'INJURY': return <span className="material-symbols-outlined text-xl text-blue-400">medical_services</span>;
            default: return null;
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl p-0 md:p-4 overflow-y-auto"
            onClick={handleBackdropClick}
        >
            <div className="bg-[#0b121f] border border-white/10 rounded-none md:rounded-sm w-full max-w-4xl min-h-screen md:min-h-0 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden animate-in fade-in zoom-in duration-300">

                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffd900] to-transparent"></div>
                <div className="absolute -top-24 -left-24 size-64 bg-[#ffd900]/5 blur-[100px] rounded-full"></div>
                <div className="absolute -bottom-24 -right-24 size-64 bg-blue-500/5 blur-[100px] rounded-full"></div>

                {/* Header / Toolbar */}
                <div className="px-6 md:px-8 py-4 border-b border-white/5 flex justify-between items-center bg-white/5 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-[#ffd900]">Reporte Oficial de Encuentro</h2>
                            <p className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">
                                ID #{match.id}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="material-symbols-outlined text-[10px] text-white/20">schedule</span>
                                <span className="text-[9px] font-bold text-white/60 uppercase tracking-tighter">
                                    {match.status === 'SCHEDULED' ? (
                                        match.played_at ? `Programado: ${formatLocalDateTime(match.played_at)}` : 'Horario por definir'
                                    ) : (
                                        `Jugado el: ${formatLocalDateTime(match.played_at, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {canEdit && onEdit && (
                            <button
                                onClick={onEdit}
                                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/5 hover:bg-[#ffd900] hover:text-black text-white/40 transition-all rounded-sm group"
                            >
                                <span className="material-symbols-outlined text-sm">edit</span>
                                <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">Editar Partido</span>
                            </button>
                        )}
                        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                </div>

                <div className="p-6 md:p-12 relative z-10 flex flex-col gap-8 md:gap-12 text-white">

                    {/* Warning for Pending ELO */}
                    {isPending && (
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 flex items-center gap-4 animate-pulse">
                            <span className="material-symbols-outlined text-blue-400">info</span>
                            <p className="text-[9px] md:text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                Este partido todavía no ha sido incorporado al Ránking ELO oficial.
                            </p>
                        </div>
                    )}

                    {/* Tournament Header Centered */}
                    <div className="flex flex-col items-center text-center -mb-4">
                        {match.tournament_id ? (
                            <Link
                                to={`/tournament/${match.tournament_id}`}
                                className="group/tour hover:scale-105 transition-transform"
                            >
                                <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter italic text-white group-hover/tour:text-[#ffd900] transition-colors">
                                    {match.tournament_name || 'Amistoso Oficial'}
                                </h2>
                                <div className="h-0.5 w-0 group-hover/tour:w-full bg-[#ffd900] mx-auto transition-all duration-300"></div>
                            </Link>
                        ) : (
                            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter italic text-white/40">
                                Amistoso Oficial
                            </h2>
                        )}
                        <div className="flex items-center gap-2 mt-2 opacity-40">
                            <span className="h-px w-8 bg-white/20"></span>
                            <span className="text-[8px] font-bold uppercase tracking-[0.3em]">Incidencia de Juego</span>
                            <span className="h-px w-8 bg-white/20"></span>
                        </div>
                    </div>

                    {/* Main Scoreboard */}
                    <div className="flex flex-row items-center justify-between md:grid md:grid-cols-3 gap-4 md:gap-4 lg:gap-8 relative">
                        {/* Team Home */}
                        <div className="flex flex-col items-center gap-2 md:gap-6 text-center group w-auto">
                            <div className="size-14 sm:size-20 md:size-24 lg:size-32 bg-black/40 border border-white/10 p-2 sm:p-3 md:p-5 rounded-sm relative group-hover:border-[#ffd900]/50 transition-all duration-500 overflow-hidden shadow-2xl shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#ffd900]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                {match.home_logo || match.home_logo_url ? (
                                    <img src={apiService.resolveImageUrl(match.home_logo || match.home_logo_url)} className="w-full h-full object-contain relative z-10" />
                                ) : (
                                    <span className="material-symbols-outlined text-2xl sm:text-3xl md:text-5xl text-white/5 relative z-10">shield</span>
                                )}
                            </div>
                            <div className="space-y-1 md:space-y-2">
                                <h3 className="hidden md:block text-lg md:text-2xl lg:text-3xl font-black text-white italic tracking-tighter uppercase leading-tight md:leading-none">
                                    {match.home_name}
                                </h3>
                                <div className="inline-flex items-center px-2 md:px-3 py-0.5 md:py-1 bg-white/5 rounded-full">
                                    <span className="text-[7px] md:text-[9px] font-black text-white/40 uppercase tracking-widest">Local</span>
                                </div>
                            </div>
                        </div>

                        {/* Score Divider */}
                        <div className="flex flex-col items-center justify-center gap-2 md:gap-4 flex-1">
                            <div className="flex items-center gap-2 sm:gap-4 md:gap-4 lg:gap-8">
                                <span className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-white italic tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                    {match.status === 'SCHEDULED' ? '-' : (match.score_home || 0)}
                                </span>
                                <div className="flex flex-col items-center">
                                    <div className="h-4 md:h-12 w-[1px] md:w-[2px] bg-gradient-to-b from-transparent via-[#ffd900] to-transparent"></div>
                                    <span className="text-[10px] md:text-lg font-black text-[#ffd900] italic my-1 md:my-2">VS</span>
                                    <div className="h-4 md:h-12 w-[1px] md:w-[2px] bg-gradient-to-b from-transparent via-[#ffd900] to-transparent"></div>
                                </div>
                                <span className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-white italic tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                    {match.status === 'SCHEDULED' ? '-' : (match.score_away || 0)}
                                </span>
                            </div>

                            {/* Penalties if any */}
                            {(match.penalties_home !== null || match.penalties_away !== null) && String(match.penalties_home) !== '' && (
                                <div className="bg-white/5 border border-white/10 px-2 md:px-4 py-0.5 md:py-2 rounded-sm scale-75 md:scale-100">
                                    <p className="text-[7px] md:text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5 md:mb-1 text-center">Penales</p>
                                    <div className="flex items-center justify-center gap-2 md:gap-4 font-black text-[10px] md:text-lg text-[#ffd900]">
                                        <span>({match.penalties_home || 0})</span>
                                        <span className="text-[8px] md:text-[10px] text-white/20 uppercase">PK</span>
                                        <span>({match.penalties_away || 0})</span>
                                    </div>
                                </div>
                            )}

                            {isWO && (
                                <div className="mt-1 md:mt-2 px-2 md:px-4 py-0.5 md:py-1.5 bg-red-600 text-white text-[7px] md:text-[10px] font-black uppercase tracking-[0.2em] skew-x-[-12deg] shadow-[0_0_20px_rgba(220,38,38,0.4)] whitespace-nowrap">
                                    WALKOVER
                                </div>
                            )}
                        </div>

                        {/* Team Away */}
                        <div className="flex flex-col items-center gap-2 md:gap-6 text-center group w-auto">
                            <div className="size-14 sm:size-20 md:size-24 lg:size-32 bg-black/40 border border-white/10 p-2 sm:p-3 md:p-5 rounded-sm relative group-hover:border-[#ffd900]/50 transition-all duration-500 overflow-hidden shadow-2xl shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#ffd900]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                {match.away_logo || match.away_logo_url ? (
                                    <img src={apiService.resolveImageUrl(match.away_logo || match.away_logo_url)} className="w-full h-full object-contain relative z-10" />
                                ) : (
                                    <span className="material-symbols-outlined text-2xl sm:text-3xl md:text-5xl text-white/5 relative z-10">shield</span>
                                )}
                            </div>
                            <div className="space-y-1 md:space-y-2">
                                <h3 className="hidden md:block text-lg md:text-2xl lg:text-3xl font-black text-white italic tracking-tighter uppercase leading-tight md:leading-none">
                                    {match.away_name}
                                </h3>
                                <div className="inline-flex items-center px-2 md:px-3 py-0.5 md:py-1 bg-white/5 rounded-full">
                                    <span className="text-[7px] md:text-[9px] font-black text-white/40 uppercase tracking-widest">Visitante</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Match Events Split */}
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-12 border-t border-white/5 pt-8 md:pt-12">

                        {/* Home Events */}
                        <div className="space-y-4 md:space-y-6">
                            <h4 className="text-[8px] md:text-[10px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-3">
                                <span className="h-px flex-1 bg-white/5"></span>
                                Incidencias Local
                            </h4>
                            <div className="space-y-3 md:space-y-4">
                                {homeEvents.length === 0 ? (
                                    <p className="text-[8px] md:text-[9px] text-white/20 italic uppercase tracking-widest text-center py-4">Sin incidencias registradas</p>
                                ) : (
                                    homeEvents.map((event: any, i: number) => (
                                        <div key={i} className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 bg-white/5 border border-white/5 p-2 md:p-4 rounded-sm hover:border-white/10 transition-colors text-center md:text-left">
                                            <div className="mt-0 md:mt-1 shrink-0 scale-75 md:scale-100">{getEventIcon(event.type || event.event)}</div>
                                            <div>
                                                <div className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-tighter truncate w-full max-w-[80px] md:max-w-none">{event.card_name}</div>
                                                <div className="hidden md:block text-[8px] md:text-[9px] text-white/40 mt-1 leading-relaxed">{event.description || 'Sin descripción adicional'}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Away Events */}
                        <div className="space-y-4 md:space-y-6">
                            <h4 className="text-[8px] md:text-[10px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-3">
                                Incidencias Visitante
                                <span className="h-px flex-1 bg-white/5"></span>
                            </h4>
                            <div className="space-y-3 md:space-y-4">
                                {awayEvents.length === 0 ? (
                                    <p className="text-[8px] md:text-[9px] text-white/20 italic uppercase tracking-widest text-center py-4">Sin incidencias registradas</p>
                                ) : (
                                    awayEvents.map((event: any, i: number) => (
                                        <div key={i} className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 bg-white/5 border border-white/5 p-2 md:p-4 rounded-sm hover:border-white/10 transition-colors text-center md:text-left">
                                            <div className="mt-0 md:mt-1 shrink-0 scale-75 md:scale-100">{getEventIcon(event.type || event.event)}</div>
                                            <div>
                                                <div className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-tighter truncate w-full max-w-[80px] md:max-w-none">{event.card_name}</div>
                                                <div className="hidden md:block text-[8px] md:text-[9px] text-white/40 mt-1 leading-relaxed">{event.description || 'Sin descripción adicional'}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Admin Observations */}
                    {(isWO || (match.admin_reason && match.admin_reason.trim() !== '')) && (
                        <div className="mt-4 bg-black/40 border border-white/5 p-4 md:p-6 rounded-sm">
                            <h4 className="text-[9px] md:text-[10px] font-black text-[#ffd900] uppercase tracking-[0.3em] mb-3 md:mb-4 flex items-center gap-3">
                                <span className="material-symbols-outlined text-sm">gavel</span>
                                Observaciones de Mesa / Administración
                            </h4>
                            <p className="text-[10px] md:text-[11px] text-white/60 leading-relaxed italic border-l-2 border-[#ffd900]/20 pl-4 py-1">
                                {match.admin_reason || (isWO ? "Victoria adjudicada por Walkover (W.O.) reglamentario." : "Sin observaciones adicionales.")}
                            </p>
                        </div>
                    )}

                    {/* Footer Info */}
                    <div className="mt-4 md:mt-8 flex flex-wrap justify-center gap-x-8 md:gap-x-12 gap-y-4 pt-6 md:pt-8 border-t border-white/5">
                        <div className="flex flex-col items-center">
                            <span className="text-[7px] md:text-[8px] font-black text-white/20 uppercase tracking-widest">Fecha del Encuentro</span>
                            <span className="text-[9px] md:text-[10px] font-bold text-white uppercase mt-1">
                                {match.status === 'SCHEDULED' ? 'Partido por jugarse' : (match.played_at ? formatLocalDateTime(match.played_at, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha no registrada')}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[7px] md:text-[8px] font-black text-white/20 uppercase tracking-widest">Reglamento ELO</span>
                            <span className="text-[9px] md:text-[10px] font-bold text-white uppercase mt-1">{match.elo_type || 'Liga Standard'}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[7px] md:text-[8px] font-black text-white/20 uppercase tracking-widest">Estado</span>
                            <span className={`text-[9px] md:text-[10px] font-black uppercase mt-1 ${isPending ? 'text-blue-400' : 'text-[#ffd900]'}`}>
                                {isPending ? 'VERIFICACIÓN PENDIENTE' : 'CERTIFICADO'}
                            </span>
                        </div>
                    </div>

                </div>

                <div className="px-6 md:px-8 py-4 md:py-6 bg-white/5 border-t border-white/5 text-center relative z-10">
                    <p className="text-[7px] md:text-[8px] font-bold text-white/10 uppercase tracking-[0.5em]"></p>
                </div>

            </div>
        </div>
    );
};

export default MatchDetailsModal;
