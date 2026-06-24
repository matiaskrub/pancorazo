import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface LinkDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournamentId: string | number;
    teamId: string | number;
    teamName: string;
    currentDeckId?: number | null;
    userId: string | number;
    loggedUserId: string | number;
    onLinked: () => void;
}

const LinkDeckModal: React.FC<LinkDeckModalProps> = ({
    isOpen,
    onClose,
    tournamentId,
    teamId,
    teamName,
    currentDeckId,
    userId,
    loggedUserId,
    onLinked
}) => {
    const [decks, setDecks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            fetchDecks();
        }
    }, [isOpen, userId]);

    const fetchDecks = async () => {
        setLoading(true);
        try {
            const userDecks = await apiService.getUserDecks(String(userId), String(loggedUserId));
            setDecks(Array.isArray(userDecks) ? userDecks : []);
        } catch (error) {
            console.error('Error fetching user decks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLink = async (deckId: number | null) => {
        if (submitting) return;
        setSubmitting(true);
        try {
            await apiService.linkTournamentDeck(tournamentId, teamId, deckId);
            onLinked();
            onClose();
        } catch (error: any) {
            alert(error.message || 'Error al vincular el mazo');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const filteredDecks = decks.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.format && d.format.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-[#0d121f] border border-white/10 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] rounded-sm">
                
                {/* Cabecera */}
                <div className="p-8 border-b border-white/5 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#ffd900]"></div>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Vincular Mazo</h2>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Asigna un mazo a {teamName} para este torneo</p>
                        </div>
                        <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Buscador y Contenido */}
                <div className="p-8 bg-black/20 flex flex-col gap-6 overflow-hidden">
                    
                    {/* Botón de desvinculación si tiene un mazo actualmente */}
                    {currentDeckId && (
                        <div className="p-4 bg-red-500/5 border border-red-500/10 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest block">Mazo actual vinculado</span>
                                <span className="text-xs font-black text-white uppercase tracking-tighter">ID: {currentDeckId}</span>
                            </div>
                            <button
                                onClick={() => handleLink(null)}
                                disabled={submitting}
                                className="px-4 py-2 bg-red-600/15 border border-red-600/30 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white hover:scale-105 transition-all disabled:opacity-50"
                            >
                                Desvincular Mazo
                            </button>
                        </div>
                    )}

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="BUSCAR MAZO..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 p-4 pl-12 text-[10px] font-bold text-white uppercase tracking-widest focus:outline-none focus:border-[#ffd900] transition-all"
                        />
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20">search</span>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[350px] pr-2">
                        {loading ? (
                            <div className="py-20 text-center">
                                <div className="size-10 border-4 border-[#ffd900]/20 border-t-[#ffd900] rounded-full animate-spin mx-auto mb-4"></div>
                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Cargando tus mazos...</span>
                            </div>
                        ) : filteredDecks.length === 0 ? (
                            <div className="py-16 text-center border-2 border-dashed border-white/5">
                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mb-2">
                                    {decks.length === 0 ? 'No tienes mazos creados' : 'No se encontraron mazos'}
                                </span>
                                {decks.length === 0 && (
                                    <a
                                        href="/builder"
                                        className="text-[9px] font-black text-[#ffd900] uppercase tracking-widest hover:underline"
                                    >
                                        Ir al Creador de Mazos
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredDecks.map((deck) => {
                                    const isLinked = currentDeckId === deck.id;
                                    return (
                                        <div 
                                            key={deck.id} 
                                            className={`p-4 bg-white/5 border flex items-center justify-between group transition-all rounded-sm ${
                                                isLinked 
                                                    ? 'border-[#ffd900]/40 bg-[#ffd900]/5' 
                                                    : 'border-white/10 hover:border-[#ffd900]/30'
                                            }`}
                                        >
                                            <div className="flex flex-col gap-1 max-w-[70%]">
                                                <div className="text-xs font-black text-white uppercase tracking-tighter truncate">{deck.name}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded-sm">
                                                        {deck.format || 'Pichanga'}
                                                    </span>
                                                    <span className="text-[8px] font-black text-[#ffd900] uppercase tracking-widest">
                                                        WR: {deck.win_rate ? `${deck.win_rate}%` : '0.0%'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleLink(deck.id)}
                                                disabled={submitting || isLinked}
                                                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-transform rounded-sm ${
                                                    isLinked
                                                        ? 'bg-[#ffd900]/20 text-[#ffd900] cursor-default'
                                                        : 'bg-[#ffd900] text-black hover:scale-105'
                                                } disabled:opacity-50`}
                                            >
                                                {isLinked ? 'Vinculado' : 'Vincular'}
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

export default LinkDeckModal;
