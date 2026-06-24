
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Card } from '../types';

interface DeckStatsProps {
  deckItems: { card: Card, q: number }[];
  canchaCards: Card[];
}

const TYPE_COLORS: Record<string, string> = {
  'JUGADA': '#22c55e', // verde
  'FOUL': '#000000', // negro
  'ESTRATEGIA': '#d1d5db', // gris claro
  'HINCHADA': '#ef4444', // rojo
  'ENERGIA': '#ffd700', // amarillo
};

const RARITY_COLORS: Record<string, string> = {
  'AMATEUR': '#3b82f6', // azul
  'SEMIPROFESIONAL': '#ef4444', // rojo
  'PROFESIONAL': '#eab308', // amarillo
  'CLASE MUNDIAL': '#22c55e', // verde
  'LEYENDA': '#ffffff', // blanco
};

// Helper to normalize text (remove accents and stay in uppercase)
const normalizeText = (text: string) => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1f2e] border-2 border-[#ffd700] p-4 rounded-2xl shadow-[0_0_30px_rgba(255,215,0,0.2)]">
        <p className="text-3xl font-black text-[#ffd700] leading-none mb-1">{payload[0].value} <span className="text-[12px] text-white/40 uppercase tracking-tighter">unids</span></p>
        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Coste: {label}</p>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1f2e] border-2 border-[#ffd700] p-4 rounded-2xl shadow-[0_0_30px_rgba(255,215,0,0.3)]">
        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">{normalizeText(payload[0].name)}</p>
        <p className="text-4xl font-black text-[#ffd700] leading-none">{payload[0].value}</p>
        <p className="text-[10px] font-bold text-white/20 mt-1 uppercase">Cantidad en mazo</p>
      </div>
    );
  }
  return null;
};

const DeckStats: React.FC<DeckStatsProps> = ({ deckItems, canchaCards }) => {
  const isPlayer = (card: Card) => {
    const category = normalizeText(card.category || card.type || '');
    const type = normalizeText(card.type || '');
    const position = normalizeText(card.position || '');
    const isPlayerPos = ['DL', 'MC', 'DF', 'PO'].includes(position);
    return category.includes('JUGADOR') || category.includes('PLAYER') || type.includes('JUGADOR') || isPlayerPos;
  };

  const isEnergy = (card: Card) => {
    const category = normalizeText(card.category || card.type || '');
    return category.includes('ENERGIA') || category.includes('ENERGY');
  };

  // --- Tactical Metrics ---
  const metrics = useMemo(() => {
    let atk = 0;
    let def = 0;
    let totalCost = 0;
    let supportCount = 0;

    // Calcular ataque y defensa a partir de los 7 jugadores en cancha
    const canchaPlayers = canchaCards || [];
    canchaPlayers.forEach((card) => {
      atk += Number(card.stats_attack) || 0;
      def += Number(card.stats_defense) || 0;
    });

    deckItems.forEach(({ card, q }) => {
      const qty = Number(q);
      
      if (!isEnergy(card) && Number(card.has_x_cost) !== 1) { // Correct Comparison: Number vs 1
        totalCost += (Number(card.cost) || 0) * qty;
        supportCount += qty;
      }
    });

    return { 
      totalAttack: atk, 
      totalDefense: def,
      avgCost: supportCount > 0 ? (totalCost / supportCount).toFixed(1) : '0.0'
    };
  }, [deckItems, canchaCards]);

  // --- Distribution Data ---
  const { energyData, rarityData, typeData } = useMemo(() => {
    const energyMap: Record<string, number> = {};
    for (let i = 0; i <= 10; i++) energyMap[i] = 0;
    const rarityMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};

    deckItems.forEach(({ card, q }) => {
      const qty = Number(q);

      // Energy curve (strictly non-players, non-energies)
      if (!isPlayer(card) && !isEnergy(card)) {
        const costValue = Number(card.cost);
        if (!isNaN(costValue) && costValue >= 0 && costValue <= 10) {
           energyMap[costValue] += qty;
        }
      }

      // Rarity distribution
      const rarity = normalizeText(card.rarity || 'Amateur');
      rarityMap[rarity] = (rarityMap[rarity] || 0) + qty;

      // Type distribution
      if (!isPlayer(card)) {
        const type = normalizeText(card.category || card.type || 'Otro');
        typeMap[type] = (typeMap[type] || 0) + qty;
      }
    });

    return {
      energyData: Object.entries(energyMap).map(([name, value]) => ({ name, value })),
      rarityData: Object.entries(rarityMap).map(([name, value]) => ({ name, value })),
      typeData: Object.entries(typeMap).map(([name, value]) => ({ name, value }))
    };
  }, [deckItems]);

  const totalCardsCount = deckItems.reduce((a, b) => a + Number(b.q), 0);

  return (
    <div className="space-y-8 p-6 animate-fadeIn">
      {/* Overview Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1f2e] border-2 border-white/5 p-5 rounded-2xl text-center shadow-lg hover:border-white/20 transition-all group">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1 group-hover:text-white/60 transition-colors">Mazo Total</p>
          <p className="text-2xl font-black text-white">{totalCardsCount} <span className="text-[10px] text-white/20">cartas</span></p>
        </div>
        <div className="bg-[#ffd700]/5 border-2 border-[#ffd700]/20 p-5 rounded-2xl text-center shadow-lg hover:border-[#ffd700]/40 transition-all group">
          <p className="text-[9px] font-black text-[#ffd700]/50 uppercase tracking-[0.2em] mb-1 group-hover:text-[#ffd700]/80 transition-colors">Coste Apoyo Med.</p>
          <p className="text-2xl font-black text-[#ffd700]">{metrics.avgCost}</p>
        </div>
        <div className="bg-red-500/5 border-2 border-red-500/20 p-5 rounded-2xl text-center shadow-lg hover:border-red-500/40 transition-all">
          <p className="text-[9px] font-black text-red-400/50 uppercase tracking-[0.2em] mb-1">Ataque (Máx. Posible)</p>
          <p className="text-2xl font-black text-red-400">{metrics.totalAttack}</p>
        </div>
        <div className="bg-blue-500/5 border-2 border-blue-500/20 p-5 rounded-2xl text-center shadow-lg hover:border-blue-500/40 transition-all">
          <p className="text-[9px] font-black text-blue-400/50 uppercase tracking-[0.2em] mb-1">Defensa (Máx. Posible)</p>
          <p className="text-2xl font-black text-blue-400">{metrics.totalDefense}</p>
        </div>
      </div>

      {/* Energy Curve */}
      <div className="bg-[#1a1f2e] border-2 border-white/5 p-6 rounded-2xl shadow-xl hover:border-white/20 transition-all">
        <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2 opacity-60">
           <span className="material-symbols-outlined text-[#ffd700] fill-1">analytics</span> Curva de Apoyo (Excl. Jugadores)
        </h3>
        <div className="h-48 w-full" style={{ minHeight: '200px' }}>
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <BarChart data={energyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff10" fontSize={10} tickLine={false} axisLine={false} width={25} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" fill="#ffd700" radius={[4, 4, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distributions Side-by-Side */}
      <div className="grid grid-cols-1 gap-10">
        {/* Rarity Distribution */}
        <div className="bg-[#1a1f2e] border-2 border-white/5 p-8 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffd700]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <h3 className="text-[11px] font-black text-[#ffd700] uppercase tracking-[0.3em] mb-6 opacity-40 text-center">Rarezas</h3>
          <div className="h-64" style={{ minHeight: '260px' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <PieChart>
                <Pie
                  data={rarityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={110}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="#1a1f2e"
                  strokeWidth={4}
                  animationBegin={0}
                  animationDuration={1000}
                >
                  {rarityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RARITY_COLORS[normalizeText(entry.name)] || '#ffffff'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="bg-[#1a1f2e] border-2 border-white/5 p-8 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffd700]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <h3 className="text-[11px] font-black text-[#ffd700] uppercase tracking-[0.3em] mb-6 opacity-40 text-center">Composición de Mazo</h3>
          <div className="h-64" style={{ minHeight: '260px' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={110}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="#1a1f2e"
                  strokeWidth={4}
                  animationBegin={300}
                  animationDuration={1000}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-type-${index}`} fill={TYPE_COLORS[normalizeText(entry.name)] || '#ffffff'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckStats;
