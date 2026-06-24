import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Team } from '../types';

const Rankings: React.FC = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const tableRowRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});

  useEffect(() => {
    // Cargar usuario y equipo
    const savedUser = localStorage.getItem('user');

    const fetchTeams = async () => {
      try {
        const data = await apiService.getTeams(false, true);
        // Ordenar por Puntos de Ranking Oficial descendente
        const sortedTeams = [...data]
          .filter(t => (Number(t.official_ranking_points) || 0) > 0)
          .sort((a, b) => {
            const ptsA = Number(a.official_ranking_points) || 0;
            const ptsB = Number(b.official_ranking_points) || 0;
            if (ptsB !== ptsA) return ptsB - ptsA;

            // 1. Rendimiento
            const getPerformance = (t: Team) => {
              const w = Number(t.official_wins_count || 0);
              const d = Number(t.official_draws_count || 0);
              const l = Number(t.official_losses_count || 0);
              const total = w + d + l;
              return total === 0 ? 0 : (w * 3 + d) / (total * 3);
            };
            const perfA = getPerformance(a);
            const perfB = getPerformance(b);
            if (perfB !== perfA) return perfB - perfA;

            // 2. ELO
            const eloA = Number(a.current_elo) || 0;
            const eloB = Number(b.current_elo) || 0;
            if (eloB !== eloA) return eloB - eloA;

            // 3. Partidos oficiales (menor arriba)
            const matchesA = Number(a.official_total_matches) || 0;
            const matchesB = Number(b.official_total_matches) || 0;
            return matchesA - matchesB;
          });
        setTeams(sortedTeams);

        // Identificar equipo del usuario si existe
        if (savedUser) {
          const user = JSON.parse(savedUser);
          const userTeam = data.find((t: Team) => String(t.owner_user_id) === String(user.id));
          if (userTeam) {
            setUserTeamId(userTeam.id);
          }
        }
      } catch (error) {
        console.error('Error fetching rankings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const scrollToMyPosition = () => {
    if (userTeamId && tableRowRefs.current[userTeamId]) {
      tableRowRefs.current[userTeamId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Breve resalte visual
      const element = tableRowRefs.current[userTeamId];
      if (element) {
        element.classList.add('bg-[#ffd900]/20');
        setTimeout(() => element.classList.remove('bg-[#ffd900]/20'), 2000);
      }
    }
  };

  const calculateWinRate = (team: Team) => {
    const wins = Number(team.official_wins_count || 0);
    const draws = Number(team.official_draws_count || 0);
    const losses = Number(team.official_losses_count || 0);

    const total = wins + draws + losses;
    if (total === 0) return 0;

    const points = wins * 3 + draws;
    const maxPossiblePoints = total * 3;

    return ((points / maxPossiblePoints) * 100).toFixed(1);
  };

  const getLegacyMultiplier = (count: number) => {
    if (count >= 7) return 2.0;
    if (count === 6) return 1.8;
    if (count === 5) return 1.6;
    if (count === 4) return 1.4;
    if (count === 3) return 1.2;
    return 1.0;
  };

  const handleTeamClick = (team: Team) => {
    if (team.slug) {
      navigate(`/team/${team.slug}`);
    }
  };

  const topThree = teams.slice(0, 3);
  const displayTeams = [...teams];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd900]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-10 py-10 space-y-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic">RANKING <span className="text-[#ffd900]">OFICIAL</span></h1>
        </div>
        <div className="flex gap-4">
          {userTeamId && (
            <button
              onClick={scrollToMyPosition}
              className="flex items-center gap-2 px-6 py-2 bg-[#ffd900] text-black rounded font-bold hover:bg-[#ffd900]/80 transition-all shadow-lg shadow-[#ffd900]/20"
            >
              <span className="material-symbols-outlined text-sm">leaderboard</span> MI POSICIÓN
            </button>
          )}
        </div>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        {/* Rank 2 */}
        <div
          onClick={() => topThree[1] && handleTeamClick(topThree[1])}
          className={`order-2 md:order-1 bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden h-[240px] flex flex-col justify-end ${topThree[1] ? 'cursor-pointer hover:border-[#ffd900]/30 transition-all' : ''}`}
        >
          <div className="absolute top-4 right-4 text-6xl font-black text-slate-800 italic">2</div>
          {topThree[1] ? (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="size-16 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
                  {topThree[1].logo_url ? (
                    <img src={apiService.resolveImageUrl(topThree[1].logo_url)} alt="" className="size-full object-contain p-2" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-slate-400">shield</span>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white truncate max-w-[150px]">{topThree[1].name}</h3>
                  <p className="text-slate-500 text-sm">@{topThree[1].owner_name || 'Sin dueño'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#101622] p-3 rounded">
                  <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">PUNTOS KO</p>
                  <p className="text-xl font-black text-white">{Number(topThree[1].official_ranking_points || 0).toFixed(1)}</p>
                </div>
                <div className="bg-[#101622] p-3 rounded">
                  <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">LEGADO</p>
                  <p className="text-xl font-black text-[#ffd900]">x{getLegacyMultiplier(topThree[1].official_legacy_count || 0).toFixed(1)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-slate-700 font-bold">Sin clasificar</div>
          )}
        </div>

        {/* Rank 1 */}
        <div
          onClick={() => topThree[0] && handleTeamClick(topThree[0])}
          className={`order-1 md:order-2 bg-[#ffd900]/10 border-2 border-[#ffd900] rounded-xl p-8 relative h-[320px] flex flex-col justify-end transform md:-translate-y-4 shadow-2xl shadow-[#ffd900]/10 ${topThree[0] ? 'cursor-pointer hover:bg-[#ffd900]/20 transition-all' : ''}`}
        >
          <div className="absolute top-4 right-4 text-9xl font-black text-[#ffd900]/20 italic">1</div>
          {topThree[0] ? (
            <>
              <div className="flex flex-col items-center text-center gap-4 mb-6">
                <div className="size-28 rounded-2xl bg-[#ffd900] flex items-center justify-center shadow-xl relative z-10 -mt-8">
                  {topThree[0].logo_url ? (
                    <img src={apiService.resolveImageUrl(topThree[0].logo_url)} alt="" className="size-full object-contain p-2 drop-shadow-2xl" />
                  ) : (
                    <span className="material-symbols-outlined text-6xl text-black">trophy</span>
                  )}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 bg-[#ffd900] px-3 py-1 rounded-full text-[10px] font-black tracking-widest text-black mb-2 uppercase">
                    LÍDER ACTUAL
                  </div>
                  <h3 className="text-3xl font-black text-white italic truncate max-w-[250px]">{topThree[0].name}</h3>
                  <p className="text-slate-400 text-sm">@{topThree[0].owner_name || 'Sin dueño'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 p-3 rounded text-center">
                  <p className="text-[8px] text-[#ffd900] uppercase font-bold tracking-widest">PUNTOS KO</p>
                  <p className="text-2xl font-black text-white">{Number(topThree[0].official_ranking_points || 0).toFixed(1)}</p>
                </div>
                <div className="bg-black/40 p-3 rounded text-center flex flex-col justify-center items-center">
                  <p className="text-[8px] text-[#ffd900] uppercase font-bold tracking-widest">LEGADO</p>
                  <p className="text-2xl font-black text-white flex items-center justify-center gap-1">
                    x{getLegacyMultiplier(topThree[0].official_legacy_count || 0).toFixed(1)}
                    {(topThree[0].official_legacy_count || 0) >= 7 && <span className="material-symbols-outlined text-[#ffd900] text-xl">military_tech</span>}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-slate-700 font-bold text-center">Sin clasificar</div>
          )}
        </div>

        {/* Rank 3 */}
        <div
          onClick={() => topThree[2] && handleTeamClick(topThree[2])}
          className={`order-3 bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden h-[220px] flex flex-col justify-end ${topThree[2] ? 'cursor-pointer hover:border-[#ffd900]/30 transition-all' : ''}`}
        >
          <div className="absolute top-4 right-4 text-6xl font-black text-slate-800 italic">3</div>
          {topThree[2] ? (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="size-16 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
                  {topThree[2].logo_url ? (
                    <img src={apiService.resolveImageUrl(topThree[2].logo_url)} alt="" className="size-full object-contain p-2" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-slate-400">shield</span>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white truncate max-w-[150px]">{topThree[2].name}</h3>
                  <p className="text-slate-500 text-sm">@{topThree[2].owner_name || 'Sin dueño'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#101622] p-3 rounded">
                  <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">PUNTOS KO</p>
                  <p className="text-xl font-black text-white">{Number(topThree[2].official_ranking_points || 0).toFixed(1)}</p>
                </div>
                <div className="bg-[#101622] p-3 rounded">
                  <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">LEGADO</p>
                  <p className="text-xl font-black text-[#ffd900]">x{getLegacyMultiplier(topThree[2].official_legacy_count || 0).toFixed(1)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-slate-700 font-bold">Sin clasificar</div>
          )}
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">CLASIFICACIÓN COMPLETA</h3>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
              MOSTRANDO {Math.max(displayTeams.length, teams.length)} FILAS
            </span>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800">
                <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500 uppercase">Rango</th>
                <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500 uppercase">Nombre del Equipo</th>
                <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500 uppercase">Puntos Oficiales</th>
                <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500 uppercase text-center">G - E - P</th>
                <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500 uppercase text-center">Rendimiento %</th>
                <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500 uppercase text-center">ELO</th>
                <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500 uppercase text-right">Legado (Mult.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {displayTeams.map((team, index) => {
                const isReal = !team.id.toString().startsWith('placeholder');
                const rank = index + 1;

                return (
                  <tr
                    key={team.id}
                    ref={el => { if (isReal) tableRowRefs.current[team.id] = el; }}
                    onClick={() => isReal && handleTeamClick(team)}
                    className={`transition-colors group ${isReal ? 'hover:bg-[#ffd900]/5 cursor-pointer' : ''} ${team.id === userTeamId ? 'bg-[#ffd900]/10' : ''}`}
                  >
                    <td className={`px-6 py-4 font-black text-lg ${rank === 1 && isReal ? 'text-[#ffd900]' : 'text-slate-500'}`}>
                      {rank.toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded bg-slate-800 flex items-center justify-center border border-slate-700 overflow-hidden">
                          {isReal && team.logo_url ? (
                            <img src={apiService.resolveImageUrl(team.logo_url)} alt="" className="size-full object-contain p-1" />
                          ) : (
                            <span className="material-symbols-outlined text-xs text-slate-400">shield</span>
                          )}
                        </div>
                        <span className={`font-bold ${isReal ? 'text-white group-hover:text-[#ffd900]' : 'text-slate-700'}`}>{team.name}</span>
                        {rank === 1 && isReal && <span className="material-symbols-outlined text-[#ffd900] text-sm fill-1">verified</span>}
                        {team.id === userTeamId && isReal && (
                          <span className="px-2 py-0.5 bg-[#ffd900] text-black text-[8px] font-black rounded uppercase ml-2 tracking-tighter">Tu Equipo</span>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-4 font-black ${isReal ? 'text-white' : 'text-slate-800'}`}>
                      {isReal ? Number(team.official_ranking_points || 0).toFixed(1) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-sm text-slate-500">
                      {isReal ? `${team.official_wins_count || 0} - ${team.official_draws_count || 0} - ${team.official_losses_count || 0}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isReal ? (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${rank === 1 ? 'bg-[#ffd900]/20 text-[#ffd900]' : 'bg-slate-800 text-slate-400'}`}>
                          {calculateWinRate(team)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-white">
                      {isReal ? Math.round(Number(team.current_elo) || 1200) : '-'}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold transition-all`}>
                      {isReal ? (
                        <div className="flex items-center justify-end gap-1 text-[#ffd900]">
                          {(team.official_legacy_count || 0) >= 7 && <span className="material-symbols-outlined text-sm">military_tech</span>}
                          <span className="text-sm font-black text-white">x{getLegacyMultiplier(team.official_legacy_count || 0).toFixed(1)}</span>
                          <span className="text-[9px] text-white/40 uppercase">({team.official_legacy_count || 0} JOs)</span>
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* How it Works Section */}
      <section className="w-full py-20 border-y border-white/5 bg-[#121926]/20 px-8 rounded-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-12">
            <div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-2">CÓMO <span className="text-[#ffd900]">FUNCIONA</span> EL RÁNKING <span className="text-[#ffd900]">OFICIAL</span></h2>
              <div className="w-12 h-1 bg-[#ffd900]"></div>
            </div>

            <div className="space-y-10">
              {[
                {
                  title: 'Puntos de Victoria',
                  desc: 'Todo empieza en la cancha. Las victorias suman 10 puntos base (o 20 si es una victoria "Matagigantes" ante un rival con más de 100 puntos de diferencia ELO). Los empates otorgan 5 puntos (o se ajustan a 8 y 2 según la diferencia ELO). El perdedor recibe 0, pero todos reciben 10 puntos fijos al final por participar.',
                  icon: 'emoji_events'
                },
                {
                  title: 'Bonos y Multiplicadores',
                  desc: 'Los bonos de desempeño son aditivos porcentuales a tus puntos base: Podio (hasta +40% según el lugar y asistentes), Goleador (+20%), Muralla (+20%) y Fair Play por menos tarjetas (+20%). El total acumulado se multiplica según el nivel del evento: Torneo de Barrio (x1), Copa de Ascenso (x1.5) o Copa de Oro (x2).',
                  icon: 'star'
                },
                {
                  title: 'Legado',
                  desc: 'El sistema premia la constancia. Mientras más torneos oficiales juegues seguidos, tu multiplicador de Legado crece, parte en x1.0, sube a x1.2 en tu 3er torneo y aumenta progresivamente hasta alcanzar un tope de x2.0 en tu 7mo torneo consecutivo o más, haciendo que todos tus puntos valgan el doble.',
                  icon: 'local_fire_department'
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-6">
                  <div className="size-12 rounded bg-white/5 flex-shrink-0 flex items-center justify-center border border-white/10">
                    <span className="material-symbols-outlined text-[#ffd900] text-2xl">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase italic text-white tracking-widest mb-2">{item.title}</h4>
                    <p className="text-xs text-white/40 font-medium leading-relaxed uppercase tracking-wider">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-sm overflow-hidden aspect-video border border-white/10 shadow-2xl">
            <img src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80" className="w-full h-full object-cover grayscale opacity-50" alt="Background" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-[#0a0f1a]/40 to-transparent"></div>

            <div className="absolute bottom-10 left-10">
              <div className="bg-[#ffd900] p-8 rounded-sm shadow-2xl shadow-black max-w-[300px] border border-black/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-1">RÉCORD DEL SISTEMA</p>
                <h3 className="text-4xl font-black text-black italic tracking-tighter mb-1">
                  {teams.reduce((acc, t) => acc + Number(t.official_ranking_points || 0), 0).toFixed(0).toLocaleString()}
                </h3>
                <p className="text-[8px] font-black uppercase tracking-widest text-black/40">TOTAL DE PUNTOS ENTREGADOS</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Rankings;
