
import React from 'react';
import { Card, CardRarity, CardCategory } from '../types';
import { apiService } from '../services/api';

interface BuilderCardProps {
  card: Card;
  count: number;
  onAdd: () => void;
  onRemove: () => void;
  onShowDetails: () => void;
  maxAllowed: number;
}

const BuilderCard: React.FC<BuilderCardProps> = ({ 
  card, 
  count, 
  onAdd, 
  onRemove, 
  onShowDetails,
  maxAllowed 
}) => {
  const isMaxed = count >= maxAllowed && maxAllowed !== Infinity;
  
  const getRarityColor = (rarity: string) => {
    const r = String(rarity || '').toUpperCase();
    if (r.includes('LEYENDA')) return 'from-slate-300 to-slate-400';
    if (r.includes('MUNDIAL')) return 'from-green-500 to-green-700';
    if (r.includes('PROFESIONAL') && !r.includes('SEMI')) return 'from-[#ffd900] to-[#ffb700]';
    if (r.includes('SEMIPROFESIONAL')) return 'from-red-500 to-red-700';
    return 'from-blue-500 to-blue-700';
  };

  const getRarityBorder = (rarity: string) => {
    const r = String(rarity || '').toUpperCase();
    if (r.includes('LEYENDA')) return 'border-slate-300 shadow-slate-300/20';
    if (r.includes('MUNDIAL')) return 'border-green-500 shadow-green-500/20';
    if (r.includes('PROFESIONAL') && !r.includes('SEMI')) return 'border-[#ffd900] shadow-[#ffd900]/20';
    if (r.includes('SEMIPROFESIONAL')) return 'border-red-500 shadow-red-500/20';
    return 'border-blue-500 shadow-blue-500/20';
  };

  return (
    <div className={`relative aspect-[3/4.2] group transition-all duration-300 ${count > 0 ? 'scale-[1.02]' : 'opacity-80 hover:opacity-100'}`}>
      {/* Background Glow */}
      <div className={`absolute -inset-0.5 bg-gradient-to-tr ${getRarityColor(card.rarity)} rounded-lg blur opacity-0 group-hover:opacity-30 transition duration-500`}></div>
      
      <div className={`relative h-full w-full bg-[#101622] border ${getRarityBorder(card.rarity)} rounded-lg overflow-hidden flex flex-col shadow-xl`}>
        {/* Card Image */}
        <div 
          className="relative h-full w-full bg-cover bg-center cursor-pointer"
          style={{ backgroundImage: `url(${apiService.resolveImageUrl(card.image_url)})` }}
          onClick={onShowDetails}
        >
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#101622] via-transparent to-black/40"></div>
          
          {/* Top Info Overlay */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <div className={`size-6 rounded-full flex items-center justify-center font-black text-xs text-[#101622] bg-[#ffd900] shadow-lg`}>
              {card.has_x_cost ? 'X' : card.cost}
            </div>
          </div>

          {/* Type Icon Overlay */}
          <div className="absolute top-2 right-2">
             <span className="material-symbols-outlined text-[10px] text-white/40 bg-black/40 backdrop-blur-md size-5 rounded-full flex items-center justify-center border border-white/10" title={card.category}>
               {card.category === CardCategory.PLAYER ? 'person' : 'style'}
             </span>
          </div>

          {/* Quantity Controls Overlay (The Dreamborn Way) */}
          <div className="absolute inset-x-0 bottom-0 p-2 flex flex-col gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
             <div className="flex items-center justify-between bg-black/80 backdrop-blur-md rounded-full border border-white/10 p-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  disabled={count === 0}
                  className={`size-7 rounded-full flex items-center justify-center transition-colors ${count === 0 ? 'text-white/10 cursor-not-allowed' : 'text-white hover:bg-white/10'}`}
                >
                  <span className="material-symbols-outlined text-lg">remove</span>
                </button>
                
                <span className={`text-sm font-black ${count > 0 ? 'text-[#ffd900]' : 'text-white/40'}`}>
                  {count} / {maxAllowed === Infinity ? '∞' : maxAllowed}
                </span>

                <button 
                  onClick={(e) => { e.stopPropagation(); onAdd(); }}
                  disabled={isMaxed}
                  className={`size-7 rounded-full flex items-center justify-center transition-colors ${isMaxed ? 'text-white/10 cursor-not-allowed' : 'text-white hover:bg-[#ffd900] hover:text-black'}`}
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                </button>
             </div>
          </div>
        </div>

        {/* Bottom Label (Visible when not hovered or small summary) */}
        <div className="p-2 bg-[#101622] flex flex-col gap-0.5 border-t border-white/5">
           <p className="text-[7px] font-black text-[#ffd900] uppercase tracking-widest">{card.rarity}</p>
           <h3 className="text-[10px] font-black text-white uppercase truncate tracking-tighter">{card.name}</h3>
        </div>
      </div>
    </div>
  );
};

export default BuilderCard;
