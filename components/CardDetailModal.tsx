import React from 'react';
import { Card, CardRarity, CardCategory, CardElement } from '../types';
import { apiService } from '../services/api';

interface CardDetailModalProps {
    card: Card | null;
    isOpen: boolean;
    onClose: () => void;
}

const CardDetailModal: React.FC<CardDetailModalProps> = ({ card, isOpen, onClose }) => {
    if (!isOpen || !card) return null;

    const getRarityStyles = (rarity: string) => {
        switch (String(rarity).toUpperCase()) {
            case 'LEYENDA':
                return 'text-slate-300 border-slate-300/20 bg-slate-300/5';
            case 'CLASE MUNDIAL':
                return 'text-green-400 border-green-500/20 bg-green-500/5';
            case 'PROFESIONAL':
                return 'text-[#ffd900] border-[#ffd900]/20 bg-[#ffd900]/5';
            case 'SEMIPROFESIONAL':
                return 'text-red-400 border-red-500/20 bg-red-500/5';
            default: // AMATEUR
                return 'text-blue-400 border-blue-500/20 bg-blue-500/5';
        }
    };

    const getShirtIcons = (card: Card) => {
        if (card.type?.toUpperCase() !== 'JUGADOR' || !card.shirt_color) {
            switch (card.element) {
                case CardElement.FIRE: return [{ icon: 'local_fire_department', color: 'text-red-500', label: 'Fuego' }];
                case CardElement.WATER: return [{ icon: 'water_drop', color: 'text-blue-400', label: 'Agua' }];
                case CardElement.NATURE: return [{ icon: 'eco', color: 'text-green-500', label: 'Naturaleza' }];
                case CardElement.LIGHTNING: return [{ icon: 'bolt', color: 'text-yellow-400', label: 'Rayo' }];
                case CardElement.DARK: return [{ icon: 'dark_mode', color: 'text-purple-400', label: 'Oscuridad' }];
                case CardElement.LIGHT: return [{ icon: 'light_mode', color: 'text-yellow-100', label: 'Luz' }];
                default: return [];
            }
        }

        if (card.shirt_color === 'Selección') {
            return [{ icon: 'military_tech', color: 'text-[#ffd900]', label: 'Selección' }];
        }

        const colorMap: Record<string, string> = {
            'Rojo': 'text-red-600',
            'Verde': 'text-green-600',
            'Azul': 'text-blue-600',
            'Negro': 'text-black',
            'Amarillo': 'text-yellow-400',
            'Blanco': 'text-white',
            'Naranjo': 'text-orange-500',
            'Morado': 'text-purple-600',
            'Celeste': 'text-blue-300',
            'Gris': 'text-gray-500'
        };

        return card.shirt_color.split(',').map(c => ({
            icon: 'apparel',
            color: colorMap[c.trim()] || 'text-white',
            label: c.trim()
        }));
    };

    const icons = getShirtIcons(card);
    const nationalities = card.nationality ? card.nationality.split(',').map(n => n.trim()) : [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="absolute inset-0 cursor-pointer"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-5xl bg-[#0d121f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in duration-300 max-h-[95vh] md:max-h-[90vh]">
                {/* Botón Cerrar */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 md:top-6 md:right-6 z-50 size-8 md:size-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                    <span className="material-symbols-outlined text-sm md:text-base">close</span>
                </button>

                {/* Lado Izquierdo: Imagen Grande */}
                <div className="md:w-1/2 relative bg-black/40 p-4 md:p-10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {/* Fondo decorativo */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden text-[#ffd900] select-none flex items-center justify-center">
                        <span className="material-symbols-outlined text-[300px] md:text-[400px] font-black italic opacity-10">sports_soccer</span>
                    </div>

                    <div className={`relative w-auto h-[32vh] md:h-[55vh] max-h-[calc(90vh-6rem)] ${card.orientation === 'landscape' ? 'aspect-[3.5/2.5]' : 'aspect-[2.5/3.5]'} max-w-full md:max-w-md rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 transform hover:scale-[1.01] transition-transform duration-500`}>
                        <img
                            src={apiService.resolveImageUrl(card.image_url)}
                            alt={card.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    </div>
                </div>

                {/* Lado Derecho: Datos */}
                <div className="md:w-1/2 p-5 md:p-12 overflow-y-auto custom-scrollbar space-y-5 md:space-y-8 bg-[#0d121f]">

                    {/* Título y Rareza */}
                    <div>
                        <div className={`inline-block px-3 py-1 rounded-sm border mb-2 md:mb-4 text-[10px] font-black uppercase tracking-[0.2em] ${getRarityStyles(card.rarity || 'AMATEUR')}`}>
                            {card.rarity}
                        </div>
                        <h2 className="text-2xl md:text-5xl font-black italic text-white uppercase tracking-tighter leading-tight">
                            {card.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1 md:mt-2">
                            <span className="text-[#ffd900] font-black uppercase text-[10px] md:text-xs tracking-widest">{card.type} / {card.category}</span>
                            <div className="hidden md:block h-4 w-px bg-white/10"></div>
                            <span className="text-white/40 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">EDICIÓN: {card.edition}</span>
                        </div>
                    </div>

                    {/* Stats Principales (Ataque / Defensa) */}
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="bg-white/5 border border-white/5 p-3 md:p-6 rounded-xl flex flex-col items-center group hover:border-[#ffd900]/30 transition-all">
                            <span className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1 md:mb-2">ATAQUE</span>
                            <span className="text-2xl md:text-4xl font-black text-white italic group-hover:text-[#ffd900] transition-colors">{card.stats_attack || 0}</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 p-3 md:p-6 rounded-xl flex flex-col items-center group hover:border-blue-400/30 transition-all">
                            <span className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1 md:mb-2">DEFENSA</span>
                            <span className="text-2xl md:text-4xl font-black text-white italic group-hover:text-blue-400 transition-colors">{card.stats_defense || 0}</span>
                        </div>
                    </div>

                    {/* Información Adicional */}
                    <div className="space-y-4 md:space-y-6">
                        <div className="grid grid-cols-2 gap-4 md:gap-8">
                            {card.position && (
                                <div>
                                    <h4 className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 md:mb-2 flex items-center gap-1.5 md:gap-2">
                                        <span className="material-symbols-outlined text-xs md:text-sm text-[#ffd900]">stadium</span> POSICIÓN
                                    </h4>
                                    <p className="text-sm md:text-lg font-black text-white italic uppercase">{card.position}</p>
                                </div>
                            )}
                            {card.gender && (
                                <div>
                                    <h4 className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 md:mb-2 flex items-center gap-1.5 md:gap-2">
                                        <span className="material-symbols-outlined text-xs md:text-sm text-[#ffd900]">person</span> GÉNERO
                                    </h4>
                                    <p className="text-sm md:text-lg font-black text-white italic uppercase">{card.gender}</p>
                                </div>
                            )}
                        </div>

                        {nationalities.length > 0 && (
                            <div>
                                <h4 className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5 md:gap-2">
                                    <span className="material-symbols-outlined text-xs md:text-sm text-[#ffd900]">flag</span> NACIONALIDAD
                                </h4>
                                <div className="flex flex-wrap gap-1.5 md:gap-2">
                                    {nationalities.map(n => (
                                        <span key={n} className="px-2 py-0.5 md:px-3 md:py-1 bg-white/5 border border-white/10 rounded-sm text-[9px] md:text-[10px] font-black text-white uppercase">{n}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {icons.length > 0 && (
                            <div>
                                <h4 className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5 md:gap-2">
                                    <span className="material-symbols-outlined text-xs md:text-sm text-[#ffd900]">apparel</span> COLORES / ELEMENTOS
                                </h4>
                                <div className="flex flex-wrap gap-2 md:gap-3">
                                    {icons.map((icon, i) => (
                                        <div key={i} className="flex items-center gap-1.5 md:gap-2 bg-white/5 border border-white/5 px-2 py-1 md:px-3 md:py-2 rounded-lg">
                                            <span className={`material-symbols-outlined text-sm md:text-lg ${icon.color} fill-1`}>{icon.icon}</span>
                                            <span className="text-[9px] md:text-[10px] font-black text-white uppercase">{icon.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {card.ability_text && (
                            <div className="p-4 md:p-6 bg-[#ffd900]/5 border border-[#ffd900]/10 rounded-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-5 scale-120 md:scale-150 rotate-12 group-hover:scale-[2] transition-transform duration-700">
                                    <span className="material-symbols-outlined text-5xl md:text-6xl text-[#ffd900]">auto_awesome</span>
                                </div>
                                <h4 className="text-[9px] md:text-[10px] font-black text-[#ffd900] uppercase tracking-widest mb-2 flex items-center gap-1.5 md:gap-2">
                                    <span className="material-symbols-outlined text-xs md:text-sm">auto_awesome</span> HABILIDAD / EFECTO
                                </h4>
                                <p className="text-xs md:text-sm font-medium text-white/80 leading-relaxed italic">
                                    "{card.ability_text}"
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer del Modal */}
                    <div className="pt-4 md:pt-8 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[8px] md:text-[9px] font-bold text-white/20 uppercase tracking-widest">
                            ID: {card.id}
                        </div>
                        {Number(card.is_unlimited) === 1 && (
                            <div className="flex items-center gap-1 md:gap-2 px-2 py-0.5 md:px-3 md:py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[8px] md:text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                <span className="material-symbols-outlined text-[10px] md:text-xs">all_inclusive</span> SIN LÍMITE DE COPIAS
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CardDetailModal;
