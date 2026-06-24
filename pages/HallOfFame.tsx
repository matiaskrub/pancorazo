import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { HallOfFameEntry } from '../types';
const HallOfFame: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'SEASON'>('ALL');
  const [data, setData] = useState<HallOfFameEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const season = timeFilter === 'SEASON' ? 'last90' : undefined;
      const mode = 'official';
      const response = await apiService.getHallOfFame(season, mode);
      setData(response.ranking || []);
      setStats(response.stats || null);
    } catch (error) {
      console.error('Error fetching Hall of Fame data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeFilter]);

  return (
    <div className="flex flex-col bg-[#0a0f1a] pb-20">
      {/* Hero Stats Section */}
      <section className="px-4 md:px-10 max-w-7xl mx-auto w-full pt-16 mb-20">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-white mb-6">
              SALÓN DE LA <span className="text-[#ffd900]">FAMA</span>
            </h1>
            <p className="text-sm md:text-base text-white/40 font-medium leading-relaxed max-w-lg mb-10">
              El registro definitivo de la excelencia futbolística mundial. Celebrando a los clubes más condecorados en el ecosistema de Pancorazo a través de todas las temporadas.
            </p>

            <div className="flex bg-[#1a2332]/40 rounded-sm p-1 w-fit border border-white/5">
              <button
                onClick={() => setTimeFilter('ALL')}
                className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${timeFilter === 'ALL' ? 'bg-white/5 text-white' : 'text-white/40'}`}
              >
                TODO EL TIEMPO
              </button>
              <button
                onClick={() => setTimeFilter('SEASON')}
                className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${timeFilter === 'SEASON' ? 'bg-white/5 text-white' : 'text-white/40'}`}
              >
                TEMPORADA ACTUAL
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
            {[
              {
                label: 'PARTIDOS TOTALES',
                value: stats?.globalMatches?.toLocaleString() || '0',
                trend: `+${stats?.globalMatchesTrend || 0} este mes`,
                icon: 'military_tech'
              },
              {
                label: 'TORNEOS OFICIALES',
                value: stats?.officialTournaments?.toLocaleString() || '0',
                trend: `+${stats?.officialTournamentsTrend || 0} este mes`,
                icon: 'groups'
              },
            ].map((stat, i) => (
              <div key={i} className="bg-[#121926]/60 border border-white/5 p-6 rounded-sm relative overflow-hidden flex flex-col justify-end h-[160px]">
                <span className="material-symbols-outlined absolute -right-4 -top-4 text-8xl text-white/5 opacity-20 pointer-events-none">{stat.icon}</span>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">{stat.label}</p>
                <h3 className="text-3xl font-black text-white italic mb-2 tracking-tighter">{stat.value}</h3>
                <p className={`text-[9px] font-bold uppercase tracking-widest ${stat.trend.includes('+-') || stat.trend.includes('+0') ? 'text-slate-500' : 'text-emerald-500'}`}>{stat.trend}</p>
              </div>
            ))}
            <div className="bg-[#ffd900] p-6 rounded-sm flex flex-col justify-between h-[160px] relative overflow-hidden group">
              <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-9xl text-black/10 group-hover:scale-110 transition-transform">grade</span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-black/50 mb-1">TOTAL EN SALÓN DE LA FAMA</p>
                <h3 className="text-5xl font-black text-black italic tracking-tighter">{data.length}</h3>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/60 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm fill-1">verified</span> Clubes Verificados
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hall of Fame Table */}
      <section className="px-4 md:px-10 max-w-7xl mx-auto w-full">
        <div className="bg-[#121926]/40 border border-white/5 rounded-sm overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#0c121e] text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                  <th rowSpan={2} className="px-6 py-4 text-left font-black align-middle">POSICIÓN</th>
                  <th rowSpan={2} className="px-6 py-4 text-left font-black align-middle">EQUIPO</th>
                  <th rowSpan={2} className="px-6 py-4 text-center font-black align-middle">TORNEOS OFICIALES</th>
                  <th colSpan={3} className="px-6 py-2 text-center font-black border-b border-white/5">KICK ON OFICIAL</th>
                  <th rowSpan={2} className="px-6 py-4 text-center font-black align-middle">COMUNIDAD</th>
                  <th rowSpan={2} className="px-6 py-4 text-center font-black align-middle bg-black/20 text-[#ffd900]">TOTAL TORNEOS</th>
                  <th rowSpan={2} className="px-6 py-4 text-right font-black align-middle">ÚLTIMO TROFEO</th>
                </tr>
                <tr className="bg-[#0c121e] text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                  <th className="px-4 py-3 text-center font-black">BARRIO</th>
                  <th className="px-4 py-3 text-center font-black">ASCENSO</th>
                  <th className="px-4 py-3 text-center font-black">ORO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-8 py-20 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ffd900] mx-auto mb-4"></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Cargando registros oficiales...</p>
                    </td>
                  </tr>
                ) : data.length > 0 ? (
                  data.map((entry) => (
                    <tr 
                      key={entry.rank} 
                      onClick={() => {
                        console.log('Navegando al equipo:', entry.teamName, 'Slug:', entry.teamSlug);
                        if (entry.teamSlug) {
                          navigate(`/team/${entry.teamSlug}`);
                        } else {
                          console.warn('El equipo no tiene un slug definido');
                        }
                      }}
                      className="hover:bg-white/5 transition-all group cursor-pointer"
                    >
                      <td className={`px-6 py-6 text-2xl font-black italic tracking-tighter ${entry.rank === 1 ? 'text-[#ffd900]' : 'text-slate-600'}`}>
                        {entry.rank.toString().padStart(2, '0')}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded bg-slate-900 border border-white/10 overflow-hidden shadow-xl group-hover:scale-105 transition-transform">
                            <img 
                              src={apiService.resolveImageUrl(entry.avatarUrl)} 
                              alt={entry.teamName} 
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.dataset.errorHandled) {
                                  target.dataset.errorHandled = 'true';
                                  target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.teamSlug || entry.rank}`;
                                }
                              }}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black uppercase italic tracking-tighter text-white">{entry.teamName}</span>
                              {entry.isVerified && <span className="material-symbols-outlined text-[12px] text-[#ffd900] fill-1">verified</span>}
                            </div>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">{entry.division}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center text-sm font-black text-[#ffd900] bg-[#ffd900]/5">{entry.trophies.official || '—'}</td>
                      <td className="px-4 py-6 text-center text-sm font-black text-white/60">{entry.trophies.ko_barrio || '—'}</td>
                      <td className="px-4 py-6 text-center text-sm font-black text-white/60">{entry.trophies.ko_ascenso || '—'}</td>
                      <td className="px-4 py-6 text-center text-sm font-black text-white/60">{entry.trophies.ko_oro || '—'}</td>
                      <td className="px-6 py-6 text-center text-sm font-black text-white/60">{entry.trophies.comunidad || '—'}</td>
                      <td className="px-6 py-6 text-center text-2xl font-black italic text-white bg-black/10">{entry.trophies.total}</td>
                      <td className="px-6 py-6 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">{entry.lastTrophy}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-8 py-20 text-center">
                      <span className="material-symbols-outlined text-4xl text-white/5 mb-4">inventory_2</span>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No hay registros para este período</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-[#0c121e] flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">MOSTRANDO 1-{data.length} DE {data.length} EQUIPOS</p>
            <div className="flex gap-2">
              <button className="size-8 rounded border border-white/5 flex items-center justify-center hover:bg-white/5 text-white/30"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
              <button className="size-8 rounded border border-white/5 flex items-center justify-center bg-[#ffd900]/10 text-[#ffd900] font-black text-xs">1</button>
              <button className="size-8 rounded border border-white/5 flex items-center justify-center hover:bg-white/5 text-white/30"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HallOfFame;
