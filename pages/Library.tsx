import React, { useState, useMemo, useEffect } from 'react';
import { apiService } from '../services/api';
import { Card } from '../types';
import FootballCard from '../components/FootballCard';
import CardDetailModal from '../components/CardDetailModal';
import { CardCategory, PlayerPosition, CardRarity } from '../types';

const Library: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [filterOptions, setFilterOptions] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeEdition, setActiveEdition] = useState<string | 'Limpiar'>('Limpiar');
  const [activeType, setActiveType] = useState<string | 'Limpiar'>('Limpiar');
  const [activeCategory, setActiveCategory] = useState<string | 'Limpiar'>('Limpiar');
  const [activePosition, setActivePosition] = useState<PlayerPosition | 'Limpiar'>('Limpiar');
  const [activeShirtColor, setActiveShirtColor] = useState<string | 'Limpiar'>('Limpiar');
  const [activeNationality, setActiveNationality] = useState<string | 'Limpiar'>('Limpiar');
  const [activeGender, setActiveGender] = useState<string | 'Limpiar'>('Limpiar');
  const [minCost, setMinCost] = useState(0);
  const [maxCost, setMaxCost] = useState(10);
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('DATE_DESC');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const toggleRarity = (rarity: string) => {
    setSelectedRarities(prev =>
      prev.includes(rarity) ? prev.filter(r => r !== rarity) : [...prev, rarity]
    );
  };

  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      try {
        const filters: any = {
          search,
          edition: activeEdition === 'Limpiar' ? '' : activeEdition,
          type: activeType === 'Limpiar' ? '' : activeType,
          category: activeCategory === 'Limpiar' ? '' : activeCategory,
          position: activePosition === 'Limpiar' ? '' : activePosition,
          shirt_color: activeShirtColor === 'Limpiar' ? '' : activeShirtColor,
          nationality: activeNationality === 'Limpiar' ? '' : activeNationality,
          gender: activeGender === 'Limpiar' ? '' : activeGender,
          min_cost: minCost,
          max_cost: maxCost,
          rarity: selectedRarities.length > 0 ? selectedRarities.join(',') : ''
        };
        const data = await apiService.getCards(filters);
        setCards(data);
        if (filterOptions.length === 0) setFilterOptions(data);
      } catch (error) {
        console.error('Error fetching cards:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchCards, 300);
    return () => clearTimeout(debounce);
  }, [search, activeEdition, activeType, activeCategory, activePosition, activeShirtColor, activeNationality, activeGender, minCost, maxCost, selectedRarities]);

  const editionsList = useMemo(() => {
    return Array.from(new Set(filterOptions.map(c => c.edition))).filter(Boolean);
  }, [filterOptions]);

  const nationalities = useMemo(() => {
    const all = filterOptions.flatMap(c => c.nationality ? c.nationality.split(',').map(n => n.trim()) : []);
    return Array.from(new Set(all)).filter(Boolean).sort();
  }, [filterOptions]);

  const genders = useMemo(() => {
    return Array.from(new Set(filterOptions.filter(c => c.gender).map(c => c.gender))).filter(Boolean);
  }, [filterOptions]);

  const typesList = useMemo(() => {
    return Array.from(new Set(filterOptions.map(c => c.type))).filter(Boolean).sort();
  }, [filterOptions]);

  const categories = useMemo(() => {
    return Array.from(new Set(filterOptions.filter(c => c.type === activeType || activeType === 'Limpiar').map(c => c.category))).filter(Boolean).sort();
  }, [filterOptions, activeType]);

  const positions = useMemo(() => {
    return Array.from(new Set(filterOptions.filter(c => (c.type === activeType || activeType === 'Limpiar') && (c.category === activeCategory || activeCategory === 'Limpiar')).map(c => c.position))).filter(Boolean).sort();
  }, [filterOptions, activeType, activeCategory]);

  const raritiesList = useMemo(() => {
    return ['Amateur', 'Semiprofesional', 'Profesional', 'Clase Mundial', 'Leyenda'];
  }, []);

  const rarityOrder: Record<string, number> = {
    'Leyenda': 5,
    'Clase Mundial': 4,
    'Profesional': 3,
    'Semiprofesional': 2,
    'Amateur': 1
  };

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      switch (sortBy) {
        case 'NAME_ASC':
          return a.name.localeCompare(b.name);
        case 'NAME_DESC':
          return b.name.localeCompare(a.name);
        case 'DATE_ASC':
          return parseInt(a.id) - parseInt(b.id);
        case 'RARITY_DESC': {
          const orderA = rarityOrder[a.rarity] || 0;
          const orderB = rarityOrder[b.rarity] || 0;
          if (orderA !== orderB) return orderB - orderA;
          return parseInt(b.id) - parseInt(a.id);
        }
        case 'RARITY_ASC': {
          const orderA = rarityOrder[a.rarity] || 0;
          const orderB = rarityOrder[b.rarity] || 0;
          if (orderA !== orderB) return orderA - orderB;
          return parseInt(b.id) - parseInt(a.id);
        }
        case 'DATE_DESC':
        default:
          return parseInt(b.id) - parseInt(a.id);
      }
    });
  }, [cards, sortBy]);

  const shirtColors = [
    { name: 'Rojo', color: 'bg-red-600', text: 'text-white' },
    { name: 'Verde', color: 'bg-green-600', text: 'text-white' },
    { name: 'Azul', color: 'bg-blue-600', text: 'text-white' },
    { name: 'Negro', color: 'bg-black', text: 'text-white' },
    { name: 'Amarillo', color: 'bg-yellow-400', text: 'text-black' },
    { name: 'Blanco', color: 'bg-white', text: 'text-black' },
    { name: 'De Selección', color: 'bg-[#ffd900]', text: 'text-black', icon: 'military_tech' }
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0c121e] relative">
      {/* SIDEBAR FILTERS (Desktop) */}
      <aside className="hidden lg:flex w-[300px] border-r border-white/5 bg-[#101622] flex-col p-6 overflow-y-auto custom-scrollbar">
        <FilterContent
          activeEdition={activeEdition} setActiveEdition={setActiveEdition}
          activeType={activeType} setActiveType={setActiveType}
          activeCategory={activeCategory} setActiveCategory={setActiveCategory}
          activePosition={activePosition} setActivePosition={setActivePosition}
          activeShirtColor={activeShirtColor} setActiveShirtColor={setActiveShirtColor}
          activeNationality={activeNationality} setActiveNationality={setActiveNationality}
          activeGender={activeGender} setActiveGender={setActiveGender}
          minCost={minCost} setMinCost={setMinCost}
          maxCost={maxCost} setMaxCost={setMaxCost}
          selectedRarities={selectedRarities} toggleRarity={toggleRarity}
          search={search} setSearch={setSearch}
          editionsList={editionsList} typesList={typesList}
          categories={categories} positions={positions}
          shirtColors={shirtColors} nationalities={nationalities}
          genders={genders} raritiesList={raritiesList}
        />
      </aside>

      {/* MOBILE FILTERS DRAWER */}
      {isFiltersOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsFiltersOpen(false)}></div>
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#101622] border-r border-white/5 flex flex-col p-6 overflow-y-auto custom-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">FILTROS</h2>
              <button onClick={() => setIsFiltersOpen(false)} className="text-white/40 hover:text-white">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <FilterContent
              activeEdition={activeEdition} setActiveEdition={setActiveEdition}
              activeType={activeType} setActiveType={setActiveType}
              activeCategory={activeCategory} setActiveCategory={setActiveCategory}
              activePosition={activePosition} setActivePosition={setActivePosition}
              activeShirtColor={activeShirtColor} setActiveShirtColor={setActiveShirtColor}
              activeNationality={activeNationality} setActiveNationality={setActiveNationality}
              activeGender={activeGender} setActiveGender={setActiveGender}
              minCost={minCost} setMinCost={setMinCost}
              maxCost={maxCost} setMaxCost={setMaxCost}
              selectedRarities={selectedRarities} toggleRarity={toggleRarity} setSelectedRarities={setSelectedRarities}
              search={search} setSearch={setSearch}
              editionsList={editionsList} typesList={typesList}
              categories={categories} positions={positions}
              shirtColors={shirtColors} nationalities={nationalities}
              genders={genders} raritiesList={raritiesList}
              onFilterApplied={() => setIsFiltersOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* MAIN GRID */}
      <section className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsFiltersOpen(true)}
              className="lg:hidden flex items-center justify-center p-2 bg-white/5 border border-white/10 rounded-sm text-[#ffd900]"
            >
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-white">BIBLIOTECA DE CARTAS</h1>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest block sm:inline-block mt-1 sm:mt-0 sm:ml-4">
                {cards.length.toLocaleString()} CARTAS ENCONTRADAS
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
            <div className="flex items-center gap-3">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/30">ORDENAR POR:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#ffd900] outline-none cursor-pointer"
              >
                <option value="DATE_DESC" className="bg-[#101622]">NUEVOS PRIMERO</option>
                <option value="DATE_ASC" className="bg-[#101622]">ANTIGUOS PRIMERO</option>
                <option value="NAME_ASC" className="bg-[#101622]">ALFABÉTICO (A-Z)</option>
                <option value="NAME_DESC" className="bg-[#101622]">ALFABÉTICO (Z-A)</option>
                <option value="RARITY_DESC" className="bg-[#101622]">RAREZA (MAYOR)</option>
                <option value="RARITY_ASC" className="bg-[#101622]">RAREZA (MENOR)</option>
              </select>
            </div>
            <div className="hidden sm:flex gap-px bg-white/5 rounded-sm p-[1px]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-sm transition-colors ${viewMode === 'grid' ? 'bg-[#ffd900] text-[#101622]' : 'hover:bg-white/5 text-white/40'}`}
              >
                <span className="material-symbols-outlined text-sm">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-sm transition-colors ${viewMode === 'list' ? 'bg-[#ffd900] text-[#101622]' : 'hover:bg-white/5 text-white/40'}`}
              >
                <span className="material-symbols-outlined text-sm">view_headline</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 pt-0 custom-scrollbar relative">
          {loading ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0c121e]/60 backdrop-blur-sm">
              <div className="w-12 h-12 border-4 border-[#ffd900]/20 border-t-[#ffd900] rounded-full animate-spin mb-4"></div>
              <p className="text-[#ffd900] font-black italic uppercase tracking-widest animate-pulse">Consultando Base de Datos...</p>
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/20 border-2 border-dashed border-white/5 rounded-sm p-8 text-center">
              <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
              <p className="font-black uppercase tracking-widest mb-4">No se encontraron cartas con estos filtros</p>
              <button
                onClick={() => {
                  setActiveEdition('Limpiar');
                  setActiveType('Limpiar');
                  setActiveCategory('Limpiar');
                  setActivePosition('Limpiar');
                  setActiveShirtColor('Limpiar');
                  setActiveNationality('Limpiar');
                  setActiveGender('Limpiar');
                  setMinCost(0);
                  setMaxCost(10);
                  setSelectedRarities([]);
                  setSearch('');
                }}
                className="px-6 py-2 bg-[#ffd900]/10 border border-[#ffd900]/40 text-[#ffd900] text-[10px] font-black uppercase tracking-widest hover:bg-[#ffd900]/20 transition-all"
              >
                RESTABLECER FILTROS
              </button>
            </div>
          ) : (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-6">
                {sortedCards.map(card => (
                  <FootballCard
                    key={card.id}
                    card={card}
                    onClick={() => {
                      setSelectedCard(card);
                      setIsDetailModalOpen(true);
                    }}
                  />
                ))}
                {/* Locked slots simulation */}
                {[...Array(Math.max(0, 10 - sortedCards.length))].map((_, i) => (
                  <div key={`locked-${i}`} className="aspect-[2.2/3.2] bg-white/5 border border-white/5 rounded-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/10 text-2xl sm:text-4xl">lock</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1 pb-20 overflow-x-auto min-w-[1000px] lg:min-w-0">
                {/* List Header */}
                <div className="hidden lg:grid grid-cols-[60px_2.5fr_1.5fr_1fr_60px_60px_60px_1fr_1.5fr_1.2fr_40px] gap-4 px-6 py-3 bg-white/5 border border-white/10 rounded-sm text-[8px] font-black uppercase tracking-[0.15em] text-white/30 mb-2 items-center">
                  <div>ID</div>
                  <div>JUGADOR</div>
                  <div>RAREZA</div>
                  <div>TIPO</div>
                  <div className="text-center">COSTO</div>
                  <div className="text-center">ATK</div>
                  <div className="text-center">DEF</div>
                  <div>POS</div>
                  <div>EDICIÓN</div>
                  <div>EQUIPO</div>
                  <div className="text-right"></div>
                </div>

                {sortedCards.map(card => (
                  <div
                    key={card.id}
                    onClick={() => { setSelectedCard(card); setIsDetailModalOpen(true); }}
                    className="grid grid-cols-[60px_2.5fr_1.5fr_1fr_60px_60px_60px_1fr_1.5fr_1.2fr_40px] gap-4 px-6 py-2.5 bg-[#101622]/40 border border-white/5 hover:border-[#ffd900]/30 hover:bg-[#ffd900]/5 transition-all rounded-sm items-center cursor-pointer group whitespace-nowrap"
                  >
                    <div className="text-[10px] font-mono text-white/20">#{card.id}</div>
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-black/40 border border-white/10 rounded-sm overflow-hidden flex items-center justify-center p-1 group-hover:scale-110 transition-transform">
                        <img src={apiService.resolveImageUrl(card.image_url)} alt="" className="size-full object-contain" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tight text-white group-hover:text-[#ffd900] transition-colors truncate">{card.name}</span>
                    </div>
                    <div>
                      <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          String(card.rarity).toUpperCase() === 'LEYENDA' ? 'bg-slate-300/10 border-slate-300 text-slate-300' :
                          String(card.rarity).toUpperCase() === 'CLASE MUNDIAL' ? 'bg-green-500/10 border-green-500 text-green-400' :
                          String(card.rarity).toUpperCase() === 'PROFESIONAL' ? 'bg-[#ffd900]/10 border-[#ffd900] text-[#ffd900]' :
                          String(card.rarity).toUpperCase() === 'SEMIPROFESIONAL' ? 'bg-red-500/10 border-red-500 text-red-400' :
                          'bg-blue-500/10 border-blue-500 text-blue-400'
                        }`}>
                        {card.rarity}
                      </span>
                    </div>
                    <div className="text-[9px] font-bold text-white/40 uppercase truncate">{card.type}</div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[10px] text-[#ffd900]">bolt</span>
                        <span className="text-[10px] font-black text-white">{card.cost}</span>
                      </div>
                    </div>
                    <div className="text-center text-[10px] font-black text-white italic">{card.stats_attack || 0}</div>
                    <div className="text-center text-[10px] font-black text-white italic">{card.stats_defense || 0}</div>
                    <div>
                      <span className="text-[9px] font-black bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/60">
                        {card.position}
                      </span>
                    </div>
                    <div className="text-[9px] font-black text-white/20 truncate">
                      {card.edition}
                    </div>
                    <div className="text-[9px] font-black text-[#ffd900]/60 truncate italic tracking-tighter">
                      {card.team || '-'}
                    </div>
                    <div className="text-right">
                      <span className="material-symbols-outlined text-white/20 group-hover:text-[#ffd900] transition-all text-sm">visibility</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </section>

      <CardDetailModal
        card={selectedCard}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
};

// Extracted Filter Content Component
const FilterContent: React.FC<any> = ({
  activeEdition, setActiveEdition,
  activeType, setActiveType,
  activeCategory, setActiveCategory,
  activePosition, setActivePosition,
  activeShirtColor, setActiveShirtColor,
  activeNationality, setActiveNationality,
  activeGender, setActiveGender,
  minCost, setMinCost,
  maxCost, setMaxCost,
  selectedRarities, toggleRarity, setSelectedRarities,
  search, setSearch,
  editionsList, typesList,
  categories, positions,
  shirtColors, nationalities,
  genders, raritiesList,
  onFilterApplied
}) => {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 lg:block hidden">FILTROS</h2>
        <button
          type="button"
          onClick={() => {
            setActiveEdition('Limpiar');
            setActiveType('Limpiar');
            setActiveCategory('Limpiar');
            setActivePosition('Limpiar');
            setActiveShirtColor('Limpiar');
            setActiveNationality('Limpiar');
            setActiveGender('Limpiar');
            setMinCost(0);
            setMaxCost(10);
            setSelectedRarities([]);
            setSearch('');
          }}
          className="text-[10px] font-black uppercase tracking-widest text-[#ffd900] hover:underline"
        >
          LIMPIAR TODO
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-8 sm:mb-10">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-lg">search</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1a2332] border border-white/10 rounded-sm pl-10 pr-4 py-2 text-xs text-white focus:ring-1 focus:ring-[#ffd900]/50 outline-none placeholder:text-white/20"
          placeholder="Buscar..."
        />
      </div>

      {/* Edición */}
      <div className="mb-8 sm:mb-10">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-[#ffd900]">style</span> EDICIÓN
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setActiveEdition('Limpiar'); onFilterApplied?.(); }}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-tighter transition-all ${activeEdition === 'Limpiar' ? 'bg-[#ffd900] text-[#101622]' : 'bg-[#1a2332] text-white/40 hover:text-white'
              }`}
          >
            TODAS
          </button>
          {editionsList.map((ed: string) => (
            <button
              key={ed}
              type="button"
              onClick={() => { setActiveEdition(ed); onFilterApplied?.(); }}
              className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-tighter transition-all ${activeEdition === ed ? 'bg-[#ffd900] text-[#101622]' : 'bg-[#1a2332] text-white/40 hover:text-white'
                }`}
            >
              {ed}
            </button>
          ))}
        </div>
      </div>

      {/* Tipo de Carta (Global) */}
      <div className="mb-8 sm:mb-10">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-[#ffd900]">style</span> TIPO
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setActiveType('Limpiar'); onFilterApplied?.(); }}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-tighter text-left ${activeType === 'Limpiar' ? 'bg-[#ffd900]/20 text-[#ffd900] border border-[#ffd900]/40' : 'bg-[#1a2332] text-white/40 border border-transparent'}`}
          >
            TODOS
          </button>
          {typesList.map((type: string) => (
            <button
              key={type}
              type="button"
              onClick={() => { setActiveType(type); onFilterApplied?.(); }}
              className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-tighter text-left ${activeType === type ? 'bg-[#ffd900]/20 text-[#ffd900] border border-[#ffd900]/40' : 'bg-[#1a2332] text-white/40 border border-transparent'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros de Jugador */}
      {(activeType === 'Limpiar' || String(activeType).toUpperCase().includes('JUGADOR') || String(activeType).toUpperCase().includes('PLAYER')) && (
        <>
          <div className="mb-8 sm:mb-10">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#ffd900]">category</span> CATEGORÍA
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setActiveCategory('Limpiar'); onFilterApplied?.(); }}
                className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-tighter text-left ${activeCategory === 'Limpiar' ? 'bg-[#ffd900]/20 text-[#ffd900] border border-[#ffd900]/40' : 'bg-[#1a2332] text-white/40 border border-transparent'}`}
              >
                TODAS
              </button>
              {categories.map((cat: string) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { setActiveCategory(cat); onFilterApplied?.(); }}
                  className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-tighter text-left ${activeCategory === cat ? 'bg-[#ffd900]/20 text-[#ffd900] border border-[#ffd900]/40' : 'bg-[#1a2332] text-white/40 border border-transparent'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-8 sm:mb-10">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#ffd900]">groups</span> POSICIÓN
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setActivePosition('Limpiar'); onFilterApplied?.(); }}
                className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-tighter text-left ${activePosition === 'Limpiar' ? 'bg-[#ffd900]/20 text-[#ffd900] border border-[#ffd900]/40' : 'bg-[#1a2332] text-white/40 border border-transparent'}`}
              >
                LIMPIAR
              </button>
              {positions.map((pos: string) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => { setActivePosition(pos); onFilterApplied?.(); }}
                  className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-tighter text-left ${activePosition === pos ? 'bg-[#ffd900]/20 text-[#ffd900] border border-[#ffd900]/40' : 'bg-[#1a2332] text-white/40 border border-transparent'}`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8 sm:mb-10">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#ffd900]">apparel</span> COLOR
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setActiveShirtColor('Limpiar'); onFilterApplied?.(); }}
                className={`size-9 rounded-sm flex items-center justify-center transition-all bg-[#1a2332] border ${activeShirtColor === 'Limpiar' ? 'border-[#ffd900] text-[#ffd900]' : 'border-white/10 text-white/20'}`}
              >
                <span className="material-symbols-outlined text-lg">block</span>
              </button>
              {shirtColors.map((el: any) => (
                <button
                  key={el.name}
                  type="button"
                  onClick={() => { setActiveShirtColor((prev: any) => prev === el.name ? 'Limpiar' : el.name); onFilterApplied?.(); }}
                  className={`size-9 rounded-sm flex items-center justify-center transition-all ${el.color} border-2 ${activeShirtColor === el.name 
                    ? 'scale-110 shadow-[0_0_15px_rgba(255,217,0,0.4)] border-[#ffd900]' 
                    : 'border-white/10 hover:border-white/30'}`}
                  title={el.name}
                >
                  <span className={`material-symbols-outlined ${el.text} text-lg ${activeShirtColor === el.name ? 'fill-1' : ''}`}>
                    {el.icon || 'apparel'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {nationalities.length > 0 && (
            <div className="mb-8 sm:mb-10">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#ffd900]">flag</span> NACIONALIDAD
              </h3>
              <select
                value={activeNationality}
                onChange={(e) => { setActiveNationality(e.target.value); onFilterApplied?.(); }}
                className="w-full bg-[#1a2332] border border-white/10 rounded-sm px-3 py-2 text-[10px] font-black uppercase text-white outline-none"
              >
                <option value="Limpiar">TODAS</option>
                {nationalities.map((n: string) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {/* Coste Energía */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#ffd900]">energy_savings_leaf</span> COSTE
          </h3>
          <span className="text-[#ffd900] text-xs font-black italic">{minCost} - {maxCost}</span>
        </div>
        <div className="relative pt-4 px-2">
          {/* Slider de Rango Unificado */}
          <div className="relative h-1 bg-white/10 rounded-full">
            <div
              className="absolute h-full bg-[#ffd900]"
              style={{
                left: `${(minCost / 10) * 100}%`,
                right: `${100 - (maxCost / 10) * 100}%`
              }}
            ></div>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={minCost}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val <= maxCost) setMinCost(val);
            }}
            className="absolute top-1/2 -translate-y-1/2 left-0 w-full accent-transparent hover:accent-[#ffd900] bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
          />
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={maxCost}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val >= minCost) setMaxCost(val);
            }}
            className="absolute top-1/2 -translate-y-1/2 left-0 w-full accent-transparent hover:accent-[#ffd900] bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
          />
        </div>
      </div>

      {/* Rareza */}
      <div className="mb-8 sm:mb-10 pb-8">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-[#ffd900]">grade</span> RAREZA
        </h3>
        <div className="space-y-2">
          {raritiesList.map((rarity: string) => (
            <label key={rarity} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                className="size-4 bg-[#1a2332] border-white/10 rounded-sm text-[#ffd900] focus:ring-0"
                checked={selectedRarities.includes(rarity)}
                onChange={() => toggleRarity(rarity)}
              />
              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${selectedRarities.includes(rarity) ? 'text-white' : 'text-white/40 group-hover:text-white'}`}>
                {rarity}
              </span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
};


export default Library;
