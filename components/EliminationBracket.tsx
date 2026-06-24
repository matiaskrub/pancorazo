import React from 'react';
import { Match } from '../types';
import { useNavigate } from 'react-router-dom';
import { formatStatus } from '../utils/formatters';
import { apiService } from '../services/api';

interface BracketProps {
    matches: Match[];
    onMatchClick?: (match: Match) => void;
}

const CARD_HEIGHT = 120; // Altura total reservada para cada slot (incluyendo márgenes)
const CARD_WIDTH = 220;
const COLUMN_GAP = 60;

const EliminationBracket: React.FC<BracketProps> = ({ matches, onMatchClick }) => {
    const navigate = useNavigate();

    // Agrupar partidos por ronda y ordenar por bracket_index
    const rounds: { [key: number]: Match[] } = {};
    matches.forEach(m => {
        if (m.round !== null && m.stage !== null) {
            if (!rounds[m.round]) rounds[m.round] = [];
            rounds[m.round].push(m);
        }
    });

    // Ordenar partidos dentro de cada ronda por bracket_index
    Object.keys(rounds).forEach(r => {
        rounds[Number(r)].sort((a, b) => (a.bracket_index || 0) - (b.bracket_index || 0));
    });

    const roundList = Object.keys(rounds).map(Number).sort((a, b) => a - b);

    if (roundList.length === 0) {
        return (
            <div className="py-20 text-center border border-dashed border-white/5 rounded-sm">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">No hay datos para mostrar el bracket</p>
            </div>
        );
    }

    return (
        <div className="relative overflow-x-auto py-10 min-h-[600px] scrollbar-thin scrollbar-thumb-white/10">
            <div className="flex gap-[60px] px-10" style={{ minWidth: roundList.length * (CARD_WIDTH + COLUMN_GAP) }}>
                {roundList.map((round, stageIdx) => (
                    <div key={round} className="relative" style={{ width: CARD_WIDTH }}>
                        {/* Título de la Ronda */}
                        <div className="absolute -top-10 left-0 w-full text-center">
                            <span className="text-[10px] font-black text-[#ffd900] uppercase tracking-widest italic">
                                {rounds[round][0].stage}
                            </span>
                        </div>

                        {rounds[round].map((match) => {
                            const slotIdx = match.bracket_index || 0;
                            const stepHeight = Math.pow(2, stageIdx) * CARD_HEIGHT;
                            const initialOffset = (Math.pow(2, stageIdx) - 1) * (CARD_HEIGHT / 2);
                            const topPos = initialOffset + (slotIdx * stepHeight);

                            return (
                                <React.Fragment key={match.id}>
                                    {/* Caja del Partido */}
                                    <div
                                        className="absolute bg-[#1a2235] border border-white/10 p-3 flex flex-col justify-center gap-2 group hover:border-[#ffd900]/50 transition-all cursor-pointer z-10"
                                        style={{
                                            top: topPos,
                                            height: 90,
                                            width: CARD_WIDTH,
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                                        }}
                                        onClick={() => onMatchClick?.(match)}
                                    >
                                        {/* Equipo Local */}
                                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                                            <div className="flex items-center gap-2 flex-1 truncate">
                                                <div className={`size-6 bg-black/40 flex items-center justify-center rounded-sm border ${match.status !== 'SCHEDULED' && (match.score_home > match.score_away || (match.penalties_home > match.penalties_away)) ? 'border-[#ffd900] shadow-[0_0_10px_rgba(255,217,0,0.3)]' : 'border-white/5'}`}>
                                                    {(match as any).home_logo ? (
                                                        <img src={apiService.resolveImageUrl((match as any).home_logo)} className="size-4 object-contain" alt="" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[12px] text-white/10">shield</span>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-tighter truncate ${!match.team_home_id ? 'text-white/10' : (match.status !== 'SCHEDULED' && (match.score_home > match.score_away || (match.penalties_home > match.penalties_away)) ? 'text-[#ffd900]' : 'text-white')}`}>
                                                    {(match as any).home_name || 'Pendiente'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-sm font-black italic ${match.status !== 'SCHEDULED' && (match.score_home > match.score_away || (match.penalties_home > match.penalties_away)) ? 'text-[#ffd900]' : 'text-white/60'}`}>
                                                    {match.status === 'SCHEDULED' ? '-' : match.score_home}
                                                </span>
                                                {match.penalties_home > 0 && <span className="text-[8px] text-white/40 italic">({match.penalties_home})</span>}
                                            </div>
                                        </div>

                                        <div className="h-[1px] bg-white/5 w-full"></div>

                                        {/* Equipo Visitante */}
                                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                                            <div className="flex items-center gap-2 flex-1 truncate">
                                                <div className={`size-6 bg-black/40 flex items-center justify-center rounded-sm border ${match.status !== 'SCHEDULED' && (match.score_away > match.score_home || (match.penalties_away > match.penalties_home)) ? 'border-[#ffd900] shadow-[0_0_10px_rgba(255,217,0,0.3)]' : 'border-white/5'}`}>
                                                    {(match as any).away_logo ? (
                                                        <img src={apiService.resolveImageUrl((match as any).away_logo)} className="size-4 object-contain" alt="" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[12px] text-white/10">shield</span>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-tighter truncate ${!match.team_away_id ? 'text-white/10' : (match.status !== 'SCHEDULED' && (match.score_away > match.score_home || (match.penalties_away > match.penalties_home)) ? 'text-[#ffd900]' : 'text-white')}`}>
                                                    {(match as any).away_name || 'Pendiente'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-sm font-black italic ${match.status !== 'SCHEDULED' && (match.score_away > match.score_home || (match.penalties_away > match.penalties_home)) ? 'text-[#ffd900]' : 'text-white/60'}`}>
                                                    {match.status === 'SCHEDULED' ? '-' : match.score_away}
                                                </span>
                                                {match.penalties_away > 0 && <span className="text-[8px] text-white/40 italic">({match.penalties_away})</span>}
                                            </div>
                                        </div>

                                        {/* Badge de Estado / Info */}
                                        <div className="absolute -bottom-2 -right-1 bg-black px-1.5 py-0.5 border border-white/10 rounded-sm">
                                            <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">{formatStatus(match.status)}</span>
                                        </div>
                                    </div>

                                    {/* Conectores (Ramas) */}
                                    {stageIdx < roundList.length - 1 && (
                                        <>
                                            {/* Salida horizontal */}
                                            <div
                                                className="absolute border-t border-white/20"
                                                style={{
                                                    top: topPos + 45,
                                                    left: CARD_WIDTH,
                                                    width: COLUMN_GAP / 2
                                                }}
                                            />

                                            {/* Vertical */}
                                            {slotIdx % 2 === 0 ? (
                                                <div
                                                    className="absolute border-r border-white/20"
                                                    style={{
                                                        top: topPos + 45,
                                                        left: CARD_WIDTH + (COLUMN_GAP / 2),
                                                        height: stepHeight / 2
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="absolute border-r border-white/20"
                                                    style={{
                                                        top: topPos + 45 - (stepHeight / 2),
                                                        left: CARD_WIDTH + (COLUMN_GAP / 2),
                                                        height: stepHeight / 2
                                                    }}
                                                />
                                            )}

                                            {/* Entrada horizontal al siguiente (solo si es par, para dibujar una sola vez hacia adelante) */}
                                            {slotIdx % 2 === 0 && (
                                                <div
                                                    className="absolute border-t border-white/20"
                                                    style={{
                                                        top: topPos + 45 + (stepHeight / 4),
                                                        left: CARD_WIDTH + (COLUMN_GAP / 2),
                                                        width: COLUMN_GAP / 2
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EliminationBracket;
