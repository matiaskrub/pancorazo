
import React from 'react';
import { Card, CardRarity, CardElement, CardCategory } from '../types';
import { apiService } from '../services/api';

interface FootballCardProps {
  card: Card;
  className?: string;
  onClick?: () => void;
}

const FootballCard: React.FC<FootballCardProps> = ({ card, className = "", onClick }) => {
  const getRarityStyles = (rarity: string) => {
    switch (String(rarity).toUpperCase()) {
      case 'LEYENDA':
        return {
          border: 'border-slate-400',
          badge: 'bg-slate-300 text-black',
        };
      case 'CLASE MUNDIAL':
        return {
          border: 'border-green-500',
          badge: 'bg-green-600 text-white',
        };
      case 'PROFESIONAL':
        return {
          border: 'border-[#ffd900]',
          badge: 'bg-[#ffd900] text-black',
        };
      case 'SEMIPROFESIONAL':
        return {
          border: 'border-red-500',
          badge: 'bg-red-600 text-white',
        };
      default: // AMATEUR
        return {
          border: 'border-blue-500',
          badge: 'bg-blue-600 text-white',
        };
    }
  };

  const getShirtIcons = (card: Card) => {
    if (card.category !== CardCategory.PLAYER || !card.shirt_color) {
      // Fallback to elements
      switch (card.element) {
        case CardElement.FIRE: return [{ icon: 'local_fire_department', color: 'text-red-500' }];
        case CardElement.WATER: return [{ icon: 'water_drop', color: 'text-blue-400' }];
        case CardElement.NATURE: return [{ icon: 'eco', color: 'text-green-500' }];
        case CardElement.LIGHTNING: return [{ icon: 'bolt', color: 'text-yellow-400' }];
        case CardElement.DARK: return [{ icon: 'dark_mode', color: 'text-purple-400' }];
        case CardElement.LIGHT: return [{ icon: 'light_mode', color: 'text-yellow-100' }];
        default: return [{ icon: 'circle', color: 'text-white' }];
      }
    }

    if (card.shirt_color === 'Selección') {
      return [{ icon: 'military_tech', color: 'text-[#ffd900]' }];
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
      color: colorMap[c.trim()] || 'text-white'
    }));
  };

  const styles = getRarityStyles(card.rarity as CardRarity);
  const icons = getShirtIcons(card);
  const nationalities = card.nationality ? card.nationality.split(',').map(n => n.trim()) : [];

  return (
    <div
      onClick={onClick}
      className={`relative aspect-[2.2/3.2] bg-slate-900 border-2 ${styles.border} rounded-sm p-1.5 overflow-hidden group hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-2xl ${className}`}
    >
      <div className="relative w-full h-full rounded-sm overflow-hidden flex flex-col">
        {/* Top Info */}
        <div className="absolute top-2 left-2 z-20 flex flex-col items-start gap-1">
          <div className="size-6 bg-[#ffd900] rounded-full flex items-center justify-center text-[#101622] font-black text-sm">
            {card.has_x_cost === 1 ? 'X' : card.cost}
          </div>
          <div className="flex flex-col gap-0.5">
            {icons.map((icon, idx) => (
              <span
                key={idx}
                className={`material-symbols-outlined text-sm ${icon.color} fill-1`}
                title={card.shirt_color || card.element}
              >
                {icon.icon}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
          <span className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-tighter ${styles.badge}`}>
            {card.rarity}
          </span>
          {nationalities.length > 0 && (
            <div className="flex flex-wrap gap-0.5 justify-end max-w-[60px]">
              {nationalities.map((nat, idx) => (
                <span key={idx} className="bg-white/10 text-white/80 text-[6px] font-black px-1 rounded-sm uppercase">
                  {nat}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Player Image */}
        <div
          className="h-full w-full bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700"
          style={{ backgroundImage: `url(${apiService.resolveImageUrl(card.image_url)})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
        </div>

        {/* Bottom Content */}
        <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col items-center">
          <p className="text-[9px] text-[#ffd900] font-black uppercase tracking-widest mb-0.5">
            {card.category} / {card.edition}
          </p>
          <h3 className="text-sm font-black italic uppercase text-white tracking-tighter text-center mb-2 truncate w-full">
            {card.name}
          </h3>

          <div className="w-full grid grid-cols-2 gap-px bg-white/10 p-[1px] rounded-sm">
            <div className="bg-black/40 px-2 py-1 text-center">
              <p className="text-[7px] text-white/40 font-bold uppercase tracking-widest leading-none mb-1">ATAQUE</p>
              <p className="text-xs font-black text-white leading-none">{card.stats_attack}</p>
            </div>
            <div className="bg-black/40 px-2 py-1 text-center">
              <p className="text-[7px] text-white/40 font-bold uppercase tracking-widest leading-none mb-1">DEFENSA</p>
              <p className="text-xs font-black text-white leading-none">{card.stats_defense}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FootballCard;
