
import React, { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { slugify } from '../utils/slugify';
import logo from '../assets/logo.png';
import CreateUserModal from './CreateUserModal';
import CreateTeamModal from './CreateTeamModal';
import { User } from '../types';
import { useCommunityMode } from '../contexts/CommunityContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userTeam, setUserTeam] = useState<any | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isCommunityMode, toggleCommunityMode, setCommunityMode } = useCommunityMode();
  const [searchQuery, setSearchQuery] = useState('');

  const isActive = (path: string) => location.pathname === path;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMenuOpen(false);
    }
  };

  React.useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      loadUserTeam(user.id);
    }
  }, []);



  const loadUserTeam = async (userId: string) => {
    try {
      const team = await apiService.getUserTeam(userId);
      setUserTeam(team);
    } catch (err) {
      console.error('Error al cargar equipo en Navbar:', err);
    }
  };



  const handleLogout = async () => {
    try {
      await apiService.logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCommunityMode(false);
    setCurrentUser(null);
    setUserTeam(null);
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const menuItems = useMemo(() => {
    const items = [
      { name: 'CARTAS', path: '/library' },
      {
        name: 'MAZOS',
        path: '#',
        submenu: [
          ...(currentUser ? [{ name: 'Creador de Mazos', path: '/builder', external: false }] : []),
          { name: 'Mazos Comunidad', path: '/explorer', external: false }
        ]
      },
      { name: 'TORNEOS', path: '/tournaments' },
      { name: 'EQUIPOS', path: '/equipos' },
      {
        name: 'RÁNKING',
        path: '/rankings',
      },
      { name: 'PALMARÉS', path: '/hall-of-fame' },
      { name: 'NOVEDADES', path: '/novedades' },
      {
        name: 'DOCUMENTOS',
        path: '#',
        submenu: [
          { name: 'Reglamento', path: '/documentos/RKO.pdf', external: true },
          { name: 'Erratas', path: '/documentos/Erratas.pdf', external: true },
          { name: 'Juego Organizado (JO)', path: '/documentos/JO.pdf', external: true }
        ]
      },
    ];
    return items;
  }, [currentUser]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#101622] px-4 md:px-10 py-2 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="xl:hidden p-2 text-white/60 hover:text-[#ffd900] transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">
              {isMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src={logo} 
              alt="Pancorazo" 
              className="h-9 w-auto object-contain brightness-110 hover:scale-105 transition-transform duration-300" 
            />
          </Link>
        </div>
        <nav className="hidden xl:flex items-center gap-8">
          {menuItems.map((item) => {
            if (item.submenu) {
              const isSubmenuActive = item.submenu.some(sub => isActive(sub.path));
              return (
                <div key={item.name} className="relative group/nav-item py-4">
                  <button
                    className={`text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${isSubmenuActive ? 'text-[#ffd900]' : 'text-slate-400 group-hover/nav-item:text-white'
                      }`}
                  >
                    {item.name}
                    <span className="material-symbols-outlined text-xs">keyboard_arrow_down</span>
                    {isSubmenuActive && <span className="absolute -bottom-0 left-0 right-0 h-0.5 bg-[#ffd900]"></span>}
                  </button>

                  <div className="absolute top-[100%] left-0 w-48 bg-[#1a2332] border border-white/10 rounded-sm shadow-2xl opacity-0 invisible group-hover/nav-item:opacity-100 group-hover/nav-item:visible transition-all duration-200 z-50 overflow-hidden">
                    <div className="flex flex-col py-2">
                      {item.submenu.map((sub: any) => (
                        sub.external ? (
                          <a
                            key={sub.path}
                            href={sub.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all text-white/60 hover:text-white hover:bg-white/5"
                          >
                            {sub.name}
                          </a>
                        ) : (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${isActive(sub.path) ? 'bg-[#ffd900] text-black' : 'text-white/60 hover:text-white hover:bg-white/5'
                              }`}
                          >
                            {sub.name}
                          </Link>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`text-[11px] font-bold uppercase tracking-wider transition-colors relative ${isActive(item.path) ? 'text-[#ffd900]' : 'text-slate-400 hover:text-white'
                  }`}
              >
                {item.name}
                {isActive(item.path) && <span className="absolute -bottom-[14px] left-0 right-0 h-0.5 bg-[#ffd900]"></span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end">
        <form onSubmit={handleSearch} className="relative mr-4 hidden lg:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-lg">search</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#1a2332] border border-white/10 rounded-sm pl-10 pr-4 py-1.5 text-xs text-white focus:ring-1 focus:ring-[#ffd900]/50 outline-none placeholder:text-white/20 min-w-[180px] xl:min-w-[240px]"
            placeholder="Buscar equipos, cartas..."
          />
        </form>

        {/* Auth Section */}
        {!currentUser ? (
          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="size-9 md:size-10 rounded-full overflow-hidden border-2 border-white/10 hover:border-[#ffd900] transition-all flex items-center justify-center bg-white/5 group shadow-lg"
              title="Ingreso al Perfil / Iniciar Sesión"
            >
              <span className="material-symbols-outlined text-white/40 group-hover:text-[#ffd900] transition-colors">person</span>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={handleLogout}
              className="hidden sm:block text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-red-500 transition-colors"
              title="Cerrar Sesión"
            >
              Cerrar Sesión
            </button>
            <Link
              to="/profile"
              className="size-10 md:size-12 rounded-full overflow-hidden border-2 border-[#ffd900]/30 hover:border-[#ffd900] transition-all bg-slate-800 flex items-center justify-center p-1 shadow-lg shadow-[#ffd900]/5"
              title="Mi Perfil"
            >
              {userTeam?.logo_url ? (
                <img src={apiService.resolveImageUrl(userTeam.logo_url)} alt="team logo" className="w-full h-full object-contain" />
              ) : (
                <span className="material-symbols-outlined text-[#ffd900]">shield</span>
              )}
            </Link>
          </div>
        )}

        {/* Admin Settings Icon (SUPER_ADMIN & EDITOR ONLY) */}
        {(currentUser?.global_role === 'SUPER_ADMIN' || currentUser?.global_role === 'ADMIN' || currentUser?.global_role === 'EDITOR') && (
          <div className="flex items-center gap-3 border-l border-white/10 pl-4 ml-2">
            <Link to="/admin" className="size-9 md:size-10 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#ffd900] transition-all group" title="Panel de Administración">
              <span className="material-symbols-outlined text-xl group-hover:rotate-45 transition-transform">settings</span>
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-[57px] z-40 xl:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <nav className="absolute left-0 top-0 bottom-0 w-64 bg-[#101622] border-r border-white/5 flex flex-col p-6 gap-4 shadow-2xl overflow-y-auto">
            {menuItems.map((item) => {
              if (item.submenu) {
                return (
                  <div key={item.name} className="flex flex-col gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">{item.name}</span>
                    <div className="flex flex-col gap-4 pl-4 border-l border-white/5">
                      {item.submenu.map((sub: any) => (
                        sub.external ? (
                          <a
                            key={sub.path}
                            href={sub.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsMenuOpen(false)}
                            className="text-xs font-black uppercase tracking-widest transition-colors text-white/60 hover:text-white"
                          >
                            {sub.name}
                          </a>
                        ) : (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={() => setIsMenuOpen(false)}
                            className={`text-xs font-black uppercase tracking-widest transition-colors ${isActive(sub.path) ? 'text-[#ffd900]' : 'text-white/60 hover:text-white'
                              }`}
                          >
                            {sub.name}
                          </Link>
                        )
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`text-sm font-black italic uppercase tracking-widest transition-colors ${isActive(item.path) ? 'text-[#ffd900]' : 'text-white/60 hover:text-white'
                    }`}
                >
                  {item.name}
                </Link>
              );
            })}
            <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4">
              <form onSubmit={handleSearch} className="relative lg:hidden">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-lg">search</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1a2332] border border-white/10 rounded-sm pl-10 pr-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-[#ffd900]/50"
                  placeholder="Buscar equipos, cartas..."
                />
              </form>
              {currentUser && (
                <button
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="text-left text-[10px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors py-2"
                >
                  CERRAR SESIÓN
                </button>
              )}
            </div>
          </nav>
        </div>
      )}

      <CreateUserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSuccess={(userId) => {
          setIsUserModalOpen(false);
          // Ya no abrimos setIsTeamModalOpen(true) porque el Wizard del registro se encarga
          
          // Refrescamos o forzamos login (idealmente el usuario inicia sesión de nuevo)
          // Pero para mantener comportamiento optimista:
          setCurrentUser({
            id: userId,
            username: 'NuevoUsuario',
            email: '', 
            global_role: 'PLAYER'
          });
          loadUserTeam(userId);
        }}
      />
      <CreateTeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        userId={currentUser?.id || ''}
      />
    </header>
  );
};

export default Navbar;
