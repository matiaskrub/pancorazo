import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MOCK_MATCHES } from '../data/mockData';
import { apiService } from '../services/api';
import { Team, User } from '../types';
import ConfirmActionModal from '../components/ConfirmActionModal';
import CreateUserModal from '../components/CreateUserModal';
import { checkTeamNameSimilarity } from '../utils/teamSimilarity';


const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { userId: urlUserId } = useParams<{ userId: string }>();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [userDecks, setUserDecks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para el login local cuando no hay sesión
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Estados para recuperación de contraseña
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [resetErrorMessage, setResetErrorMessage] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMessage('');
    setResetSuccessMessage('');
    setIsSendingReset(true);
    try {
      const result = await apiService.requestPasswordReset(resetEmail);
      setResetSuccessMessage(result.message || 'Se ha enviado un enlace de recuperación a tu correo electrónico.');
      setResetEmail('');
    } catch (err: any) {
      setResetErrorMessage(err.message || 'Error al solicitar el restablecimiento. Verifica el correo ingresado.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const result = await apiService.loginUser({ email: loginEmail, password: loginPassword });
      localStorage.setItem('user', JSON.stringify(result.user));
      setCurrentUser(result.user);
      loadData(result.user.id);
      window.location.reload();
    } catch (err: any) {
      setLoginError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Determinar si es el perfil del usuario logueado
  const savedUserStr = localStorage.getItem('user');
  const loggedUser: User | null = savedUserStr ? JSON.parse(savedUserStr) : null;
  const isOwnProfile = !urlUserId || (loggedUser && String(loggedUser.id) === String(urlUserId));

  // Alinear estados con isOwnProfile si es necesario, pero loadData se encargará de setear currentUser

  // Estados para el modal de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [editShortName, setEditShortName] = useState('');
  const [editFoundedYear, setEditFoundedYear] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Estados para gestión de cuenta
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newCountryId, setNewCountryId] = useState('');
  const [newCustomCountry, setNewCustomCountry] = useState('');
  const [newRegionId, setNewRegionId] = useState('');
  const [newCityId, setNewCityId] = useState('');
  const [newWsp, setNewWsp] = useState('');
  const [newProfileFile, setNewProfileFile] = useState<File | null>(null);
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);

  // Estados para ubicaciones
  const [countries, setCountries] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  // Para resolver nombres
  const [displayLocation, setDisplayLocation] = useState({ country: '', region: '', city: '' });


  // Estados para reclamar/crear equipo
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [unclaimedTeams, setUnclaimedTeams] = useState<Team[]>([]);
  const [pendingClaim, setPendingClaim] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [newFoundedYear, setNewFoundedYear] = useState('2024');
  const [similarityMatch, setSimilarityMatch] = useState<Team | null>(null);

  useEffect(() => {
    if (!isCreateModalOpen) {
      setSimilarityMatch(null);
    }
  }, [isCreateModalOpen]);

  // Estados para mazo nuevo
  const [searchTermClaim, setSearchTermClaim] = useState('');

  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
      isDangerous?: boolean;
      requiresInput?: string;
  }>({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: () => {},
      isDangerous: false,
      requiresInput: undefined
  });

  const openConfirm = (props: Omit<typeof confirmConfig, 'isOpen'>) => {
      setConfirmConfig({ ...props, isOpen: true });
  };

  const loadData = async (userIdToLoad?: string) => {
    try {
      let user: User | null = null;
      
      if (userIdToLoad) {
        user = await apiService.getUser(userIdToLoad);
      } else if (loggedUser) {
        user = loggedUser;
      }

      if (user) {
        setCurrentUser(user);
        setNewUsername(user.username || '');
        setNewEmail(user.email || '');
        setNewFirstName(user.first_name || '');
        setNewLastName(user.last_name || '');
        setNewCountryId(String(user.country || ''));
        setNewCustomCountry(user.custom_country || '');
        setNewRegionId(String(user.region || ''));
        setNewCityId(String(user.commune || ''));
        setNewWsp(user.wsp || '');

        const team = await apiService.getUserTeam(user.id);
        setUserTeam(team);
        if (team) {
          setEditTeamName(team.name || '');
          setEditShortName(team.short_name || '');
          setEditFoundedYear((team.founded_year ?? '').toString());
          setPendingClaim(null);
        } else if (isOwnProfile) {
          // Solo buscar reclamos o equipos disponibles si es el propio perfil
          const pending = await apiService.getUserPendingClaim(user.id);
          setPendingClaim(pending);
          if (!pending) {
            const unclaimed = await apiService.getTeams(true);
            setUnclaimedTeams(unclaimed);
          }
        }

        const decks = await apiService.getUserDecks(user.id, String(loggedUser?.id || ''));
        setUserDecks(decks);
      }
    } catch (err) {
      console.error('Error al cargar perfil:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDeck = async (deckId: number) => {
    openConfirm({
      title: 'Eliminar Mazo',
      message: '¿Estás seguro de que deseas eliminar este mazo? Esta acción no se puede deshacer.',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await apiService.deleteDeck(deckId);
          setUserDecks(prev => prev.filter(d => d.id !== deckId));
        } catch (err: any) {
          alert(err.message || 'Error al eliminar mazo');
        }
      }
    });
  };

  useEffect(() => {
    loadData(urlUserId);
    apiService.getCountries().then(setCountries).catch(console.error);
  }, [urlUserId]);

  useEffect(() => {
    if (currentUser?.country && String(currentUser.country) !== '2') {
      apiService.getRegions(currentUser.country).then(r => {
        setRegions(r);
        if (currentUser.region) {
          apiService.getCities(currentUser.region).then(setCities).catch(console.error);
        }
      }).catch(console.error);
    }
  }, [currentUser?.country, currentUser?.region]);

  useEffect(() => {
    if (!currentUser) return;
    
    let cName = '';
    if (String(currentUser.country) === '2') {
      cName = currentUser.custom_country || 'Otro';
    } else {
      cName = countries.find(c => String(c.id_country) === String(currentUser.country))?.name || '';
    }
    
    const rName = regions.find(r => String(r.id_region) === String(currentUser.region))?.name || '';
    const cityName = cities.find(c => String(c.id_city) === String(currentUser.commune))?.name || '';
    
    setDisplayLocation({ country: cName, region: rName, city: cityName });
  }, [currentUser, countries, regions, cities]);

  const handleCountryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setNewCountryId(id);
    setNewRegionId('');
    setNewCityId('');
    setCities([]);

    if (id && id !== '2') {
      const data = await apiService.getRegions(id);
      setRegions(data);
    } else {
      setRegions([]);
    }
  };

  const handleRegionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setNewRegionId(id);
    setNewCityId('');

    if (id) {
      const data = await apiService.getCities(id);
      setCities(data);
    } else {
      setCities([]);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userTeam) return;

    setIsSaving(true);
    setSaveError('');

    try {
      let logoUrl = userTeam.logo_url;
      if (editLogoFile) {
        const uploadResult = await apiService.uploadImage(editLogoFile, 'logos');
        logoUrl = apiService.resolveImageUrl(uploadResult.url);
      }

      await apiService.updateTeam(userTeam.id, {
        name: editTeamName,
        short_name: editShortName,
        logo_url: logoUrl,
        founded_year: parseInt(editFoundedYear)
      });

      await loadData();
      setIsEditModalOpen(false);
    } catch (err: any) {
      setSaveError(err.message || 'Error al actualizar equipo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsUpdatingAccount(true);
    try {
      let profileImageUrl = currentUser.profile_image;
      if (newProfileFile) {
        const uploadResult = await apiService.uploadImage(newProfileFile, 'profiles');
        profileImageUrl = uploadResult.url;
      }

      const data: any = { 
        username: newUsername,
        email: newEmail,
        first_name: newFirstName,
        last_name: newLastName,
        country: newCountryId,
        custom_country: newCountryId === '2' ? newCustomCountry : null,
        region: newRegionId || null,
        commune: newCityId || null,
        wsp: newWsp,
        profile_image: profileImageUrl
      };
      if (newPassword) data.password = newPassword;

      await apiService.updateUser(currentUser.id, data);

      const updatedUser = { ...currentUser, ...data };
      setCurrentUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setIsAccountModalOpen(false);
      setNewPassword('');
      setNewProfileFile(null);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar cuenta');
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  const handleClaimTeam = async (teamId: string) => {
    if (!currentUser) return;
    try {
      await apiService.claimTeam(teamId, currentUser.id);
      await loadData();
      setIsClaimModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error al reclamar equipo');
    }
  };

  const handleCreateTeam = async (e?: React.FormEvent, force: boolean = false, claimMatched: boolean = false) => {
    e?.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    try {
      if (claimMatched && similarityMatch) {
        await apiService.claimTeam(similarityMatch.id, currentUser.id);
        await loadData();
        setSimilarityMatch(null);
        setIsCreateModalOpen(false);
        return;
      }

      // Validar similitud de equipo antes de crear
      if (!force) {
        const allTeams = await apiService.getTeams(false, true);
        const check = checkTeamNameSimilarity(newTeamName, allTeams);
        if (check.isSimilar && check.matchedTeam) {
          setSimilarityMatch(check.matchedTeam);
          setIsSaving(false);
          return;
        }
      }

      await apiService.createTeam({
        name: newTeamName,
        short_name: newShortName,
        founded_year: parseInt(newFoundedYear),
        owner_id: currentUser.id
      });
      await loadData();
      setSimilarityMatch(null);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error al crear equipo');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-20 text-center font-bold uppercase tracking-widest text-white/20">Cargando Perfil...</div>;
  if (!currentUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-[#0a0f1a]">
        <div className="w-full max-w-md bg-[#101622] border border-[#ffd900]/20 rounded-xl overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffd900] to-transparent animate-pulse"></div>
          
          {isForgotPassword ? (
            <>
              <div className="p-8 border-b border-white/5 text-center">
                <span className="material-symbols-outlined text-5xl text-[#ffd900] mb-3 animate-pulse">lock_reset</span>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Recuperar <span className="text-[#ffd900]">Clave</span></h2>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Ingresa tu correo para recibir un enlace de restauración</p>
              </div>

              <form onSubmit={handleRequestReset} className="p-8 space-y-5">
                {resetSuccessMessage && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3 animate-in fade-in duration-300">
                    <span className="material-symbols-outlined text-green-500 text-lg mt-0.5 animate-bounce">check_circle</span>
                    <p className="text-green-400 text-[11px] font-bold uppercase tracking-wider leading-relaxed">{resetSuccessMessage}</p>
                  </div>
                )}

                {resetErrorMessage && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 animate-in fade-in duration-300">
                    <span className="material-symbols-outlined text-red-500 text-lg mt-0.5">error</span>
                    <p className="text-red-400 text-[11px] font-bold uppercase tracking-wider leading-relaxed">{resetErrorMessage}</p>
                  </div>
                )}

                {!resetSuccessMessage && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd900]">Correo Electrónico</label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded px-4 py-3 text-sm font-bold text-white focus:border-[#ffd900] outline-none transition-all placeholder:text-white/10"
                        placeholder="ejemplo@correo.com"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingReset}
                      className="w-full py-4 bg-[#ffd900] hover:bg-[#ffed4d] disabled:bg-[#ffd900]/20 text-[#101622] font-black uppercase tracking-tighter rounded-sm transition-all shadow-xl shadow-[#ffd900]/10 mt-6 h-[56px] flex items-center justify-center gap-2"
                    >
                      {isSendingReset ? (
                        <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg">send</span>
                          <span>ENVIAR INSTRUCCIONES</span>
                        </>
                      )}
                    </button>
                  </>
                )}

                <div className="pt-6 border-t border-white/5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSuccessMessage('');
                      setResetErrorMessage('');
                    }}
                    className="text-[#ffd900] hover:text-[#ffed4d] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 mx-auto"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    VOLVER AL INICIO DE SESIÓN
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="p-8 border-b border-white/5 text-center">
                <span className="material-symbols-outlined text-5xl text-[#ffd900] mb-3 animate-bounce">key</span>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Ingreso al <span className="text-[#ffd900]">Perfil</span></h2>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Inicia sesión o crea una cuenta para ver tu información</p>
              </div>

              <form onSubmit={handleLocalLogin} className="p-8 space-y-5">
                {loginError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm">
                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center leading-tight">{loginError}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd900]">Correo Electrónico</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded px-4 py-3 text-sm font-bold text-white focus:border-[#ffd900] outline-none transition-all placeholder:text-white/10"
                    placeholder="ejemplo@correo.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd900]">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[9px] font-bold text-[#ffd900] hover:text-[#ffed4d] uppercase tracking-wider transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded px-4 py-3 text-sm font-bold text-white focus:border-[#ffd900] outline-none transition-all placeholder:text-white/10"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-4 bg-[#ffd900] hover:bg-[#ffed4d] disabled:bg-[#ffd900]/20 text-[#101622] font-black uppercase tracking-tighter rounded-sm transition-all shadow-xl shadow-[#ffd900]/10 mt-6 h-[56px] flex items-center justify-center"
                >
                  {isLoggingIn ? (
                    <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                  ) : 'INICIAR SESIÓN'}
                </button>

                <div className="pt-6 border-t border-white/5 text-center">
                  <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-3">¿Aún no tienes un equipo o cuenta?</p>
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="px-6 py-2.5 bg-white/5 border border-white/10 hover:border-[#ffd900]/50 text-white/80 hover:text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all w-full"
                  >
                    REGÍSTRATE EN LA PLATAFORMA
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <CreateUserModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={(userId) => {
            setIsRegisterModalOpen(false);
            alert('¡Registro exitoso! Por favor inicia sesión con tus nuevas credenciales.');
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-10 py-10 space-y-8">
      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-xl border border-[#ffd900]/20 bg-gradient-to-br from-[#ffd900]/10 via-[#101622] to-[#101622] p-8">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="h-32 w-32 rounded-xl bg-slate-800 border-2 border-[#ffd900] shadow-[0_0_20px_rgba(255,217,0,0.3)] overflow-hidden flex items-center justify-center relative">
              {currentUser.profile_image ? (
                <img src={apiService.resolveImageUrl(currentUser.profile_image)} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-6xl text-[#ffd900]">person</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-extrabold tracking-tight uppercase text-white">
                  {currentUser.username}
                </h2>
                <span className="bg-[#ffd900]/20 text-[#ffd900] text-xs font-bold px-2 py-1 rounded border border-[#ffd900]/30">
                  {currentUser.global_role}
                </span>
              </div>
              <p className="text-slate-400 mt-1 flex items-center gap-2 uppercase font-bold text-sm">
                {currentUser.first_name || currentUser.last_name 
                  ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
                  : 'Sin Nombre Definido'}
              </p>
              <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm uppercase">
                <span className="material-symbols-outlined text-sm">location_on</span>
                {displayLocation.country 
                  ? displayLocation.country === 'Chile' && displayLocation.region
                    ? `${displayLocation.city ? displayLocation.city + ', ' : ''}${displayLocation.region}, Chile`
                    : displayLocation.country
                  : 'Ubicación no ingresada'}
              </p>
              <div className="flex gap-3 mt-4">
                    {isOwnProfile && (
                      <button
                        onClick={() => setIsAccountModalOpen(true)}
                        className="flex items-center gap-2 px-3 md:px-6 py-2 bg-white/5 text-white/60 hover:text-[#ffd900] hover:bg-[#ffd900]/10 rounded border border-white/5 hover:border-[#ffd900]/30 transition-all font-bold text-xs md:text-sm"
                      >
                        <span className="material-symbols-outlined text-sm md:text-base">edit</span>
                        <span className="hidden md:inline">EDITAR PERFIL</span>
                      </button>
                    )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Team Associated Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2 uppercase tracking-tight text-white">
            <span className="material-symbols-outlined text-[#ffd900]">shield</span> EQUIPO ASOCIADO
          </h3>
          <div className="p-0">
            {userTeam ? (
              <div className="space-y-4">
                {userTeam.status === 'PENDING' && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3 animate-in fade-in duration-300">
                    <span className="material-symbols-outlined text-yellow-500 text-lg mt-0.5 animate-pulse">pending</span>
                    <div>
                      <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Creación de Equipo Pendiente de Aprobación</p>
                      <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                        Tu equipo ha sido registrado y se encuentra en revisión. Un administrador evaluará la solicitud a la brevedad. Mientras tanto, puedes explorar la plataforma, pero las funciones competitivas de tu equipo se habilitarán una vez aprobado.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-800/20 rounded-xl border border-white/5 transition-all hover:border-[#ffd900]/30">
                  <div className="flex items-center gap-6">
                    <Link 
                      to={`/team/${userTeam.slug}`}
                      className="size-16 rounded bg-slate-900 overflow-hidden border border-[#ffd900]/30 shadow-[0_0_10px_rgba(255,217,0,0.1)] flex items-center justify-center hover:border-[#ffd900] transition-colors"
                    >
                      {userTeam.logo_url ? (
                        <img src={apiService.resolveImageUrl(userTeam.logo_url)} className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="material-symbols-outlined text-3xl text-slate-700">shield</span>
                      )}
                    </Link>
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-white uppercase text-xl">{userTeam.name}</h4>
                        {userTeam.status === 'PENDING' ? (
                          <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] font-black px-2 py-1 rounded-sm uppercase tracking-widest">
                            PENDIENTE
                          </span>
                        ) : (
                          <span className="bg-[#ffd900]/20 text-[#ffd900] text-[10px] font-black px-2 py-1 rounded-sm uppercase tracking-widest">
                            {userTeam.status || 'ACTIVO'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 uppercase mt-1 font-bold tracking-widest">{userTeam.short_name || 'TCG'} • EST. {userTeam.founded_year}</p>
                    </div>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="mt-4 md:mt-0 bg-white/5 hover:bg-white/10 text-white font-black py-2 px-6 rounded text-[10px] uppercase tracking-widest border border-white/10 transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">settings</span> Gestionar Equipo
                    </button>
                  )}
                </div>
              </div>
            ) : pendingClaim ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-800/20 rounded-xl border border-[#ffd900]/30 text-center shadow-[0_0_15px_rgba(255,217,0,0.1)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffd900] to-transparent animate-pulse"></div>
                <span className="material-symbols-outlined text-4xl text-[#ffd900] mb-3 animate-bounce">pending_actions</span>
                <p className="text-[#ffd900] font-black uppercase text-sm mb-1 tracking-widest">Solicitud en Proceso</p>
                <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest max-w-sm">
                  Has solicitado unirte al equipo <span className="text-white">"{pendingClaim.team_name}"</span>. 
                  Un administrador revisará tu petición pronto.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-800/20 rounded-xl border border-white/5 text-center">
                <span className="material-symbols-outlined text-4xl text-white/20 mb-3">group_off</span>
                <p className="text-white/40 font-bold uppercase text-xs mb-4 tracking-widest">No estás vinculado a ningún equipo</p>
                {isOwnProfile && (
                  <div className="flex gap-4">
                    <button
                      onClick={() => setIsClaimModalOpen(true)}
                      className="flex-1 py-4 bg-[#ffd900] text-black font-black uppercase tracking-widest text-[10px] rounded hover:bg-[#ffd900]/80 transition-all shadow-lg shadow-[#ffd900]/10 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">verified</span>
                      RECLAMAR EQUIPO
                    </button>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="flex-1 py-4 bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-[10px] rounded hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      CREAR EQUIPO
                    </button>
                  </div>
                )}     
              </div>
            )}
          </div>
        </div>

        {/* User Decks Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2 uppercase tracking-tight text-white">
              <span className="material-symbols-outlined text-[#ffd900]">style</span> MIS MAZOS
            </h3>
            {isOwnProfile && (
              <button
                onClick={() => navigate('/builder')}
                className="bg-[#ffd900] hover:bg-[#ffed4d] text-black font-black px-4 py-1.5 rounded-lg text-[10px] transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">add</span> NUEVO MAZO
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userDecks.length > 0 ? (
              userDecks.map(deck => (
                <div 
                  key={deck.id} 
                  onClick={() => navigate(`/builder?id=${deck.id}`)}
                  className="p-4 bg-slate-800/20 rounded-xl border border-white/5 hover:border-[#ffd900]/30 transition-all hover:bg-slate-800/40 cursor-pointer group flex items-center gap-4 relative"
                >
                  <div className="size-12 rounded-lg bg-[#ffd900]/10 flex items-center justify-center border border-[#ffd900]/20">
                    <span className="material-symbols-outlined text-[#ffd900]">style</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                       <p className="font-bold text-sm text-white group-hover:text-[#ffd900] transition-colors">{deck.name}</p>
                       <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                         deck.status === 'PUBLIC' || (deck.status === undefined && deck.is_active == 1) 
                           ? 'bg-green-500/20 text-green-500' 
                           : deck.status === 'PRIVATE' 
                             ? 'bg-purple-500/20 text-purple-400' 
                             : 'bg-[#ffd900]/20 text-[#ffd900]'
                       }`}>
                          {deck.status === 'PUBLIC' || (deck.status === undefined && deck.is_active == 1) ? 'PÚBLICO' : deck.status === 'PRIVATE' ? 'PRIVADO' : 'BORRADOR'}
                       </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[#ffd900] font-bold uppercase">{deck.card_count || 0} CARTAS</span>
                      <span className="size-1 rounded-full bg-slate-700"></span>
                      <span className="text-[10px] text-slate-500 uppercase font-black">EDITADO: {new Date(deck.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwnProfile && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDeck(deck.id); }}
                        className="size-8 rounded-full flex items-center justify-center text-white/10 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar Mazo"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                    <span className="material-symbols-outlined text-white/10 group-hover:text-[#ffd900] transition-all transform group-hover:translate-x-1">chevron_right</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-12 text-center border-2 border-dashed border-white/5 rounded-xl bg-slate-900/20">
                <span className="material-symbols-outlined text-5xl text-white/5 mb-3">style</span>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">No se han encontrado mazos armados</p>
                <button
                  onClick={() => navigate('/builder')}
                  className="mt-4 text-[10px] font-bold text-[#ffd900] hover:underline uppercase"
                >
                  Comenzar a armar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Social Links Section - Solo para Super Admin */}
        {currentUser?.global_role === 'SUPER_ADMIN' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 uppercase tracking-tight text-white">
              <span className="material-symbols-outlined text-[#ffd900]">link</span> VINCULACIONES SOCIALES
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Google */}
              <div className="p-4 bg-slate-800/20 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded bg-white flex items-center justify-center p-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-full h-full" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white uppercase">Google</p>
                    <p className="text-[10px] text-slate-500 uppercase">{currentUser.social_google_id ? 'Vinculado' : 'No vinculado'}</p>
                  </div>
                </div>
                <button
                  onClick={() => alert('Pronto implementaremos el flujo OAuth de Google')}
                  className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-sm transition-all border
                    ${currentUser.social_google_id ? 'border-red-500/30 text-red-500 hover:bg-red-500/10' : 'bg-white text-black hover:bg-gray-200'}`}
                >
                  {currentUser.social_google_id ? 'Desvincular' : 'Vincular'}
                </button>
              </div>
              
              {/* Discord */}
              <div className="p-4 bg-slate-800/20 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded bg-[#5865F2] flex items-center justify-center p-2">
                    <img src="https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" alt="Discord" className="size-6 object-contain filter brightness-0 invert" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white uppercase">Discord</p>
                    <p className="text-[10px] text-slate-500 uppercase">{currentUser.social_discord_id ? 'Vinculado' : 'No vinculado'}</p>
                  </div>
                </div>
                <button
                  onClick={() => alert('Pronto implementaremos el flujo OAuth de Discord')}
                  className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-sm transition-all border
                    ${currentUser.social_discord_id ? 'border-red-500/30 text-red-500 hover:bg-red-500/10' : 'bg-[#5865F2] text-white hover:bg-[#4752C4]'}`}
                >
                  {currentUser.social_discord_id ? 'Desvincular' : 'Vincular'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Edición de Equipo */}
      {
        isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-[#101622] border border-[#ffd900]/20 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#ffd900]/5">
                <h2 className="text-xl font-black uppercase tracking-tighter text-white">Gestionar <span className="text-[#ffd900]">Equipo</span></h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="size-10 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleUpdateTeam} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd900]">Nombre del Equipo</label>
                  <input
                    type="text"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded px-4 py-3 text-sm font-bold text-white focus:border-[#ffd900] outline-none transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#ffd900]">Abreviación (3 letras)</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={editShortName}
                      onChange={(e) => setEditShortName(e.target.value.toUpperCase())}
                      className="w-full bg-slate-900 border border-white/10 rounded px-4 py-3 text-sm font-bold text-white focus:border-[#ffd900] outline-none transition-all uppercase"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#ffd900]">Año de Fundación</label>
                    <input
                      type="number"
                      value={editFoundedYear}
                      onChange={(e) => setEditFoundedYear(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded px-4 py-3 text-sm font-bold text-white focus:border-[#ffd900] outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd900]">Logo del Equipo</label>
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden">
                      {editLogoFile ? (
                        <img src={URL.createObjectURL(editLogoFile)} className="w-full h-full object-contain" />
                      ) : userTeam?.logo_url ? (
                        <img src={apiService.resolveImageUrl(userTeam.logo_url)} className="w-full h-full object-contain" />
                      ) : (
                        <span className="material-symbols-outlined text-white/10">upload</span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditLogoFile(e.target.files?.[0] || null)}
                      className="text-xs text-white/40 file:bg-white/5 file:border-none file:px-4 file:py-2 file:rounded file:text-white file:text-[10px] file:font-black file:uppercase file:mr-4 file:cursor-pointer hover:file:bg-white/10"
                    />
                  </div>
                </div>

                {saveError && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{saveError}</p>}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 bg-[#ffd900] hover:bg-[#ffed4d] disabled:bg-[#ffd900]/20 text-[#101622] font-black uppercase tracking-tighter rounded-sm transition-all shadow-xl shadow-[#ffd900]/10 mt-4 h-[56px] flex items-center justify-center"
                >
                  {isSaving ? (
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                  ) : 'GUARDAR CAMBIOS'}
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal de Configuración de Cuenta */}
      {
        isAccountModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#101622] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-xl font-black uppercase text-white">Editar <span className="text-[#ffd900]">Perfil</span></h2>
                <button onClick={() => setIsAccountModalOpen(false)} className="text-white/40 hover:text-white"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleUpdateAccount} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Nueva Sección: Foto de Perfil */}
                <div className="flex flex-col items-center gap-4 pb-4 border-b border-white/5">
                  <div className="size-24 rounded-full bg-slate-900 border-2 border-[#ffd900]/30 overflow-hidden flex items-center justify-center shadow-lg relative group">
                    {newProfileFile ? (
                      <img src={URL.createObjectURL(newProfileFile)} className="w-full h-full object-cover" />
                    ) : currentUser.profile_image ? (
                      <img src={apiService.resolveImageUrl(currentUser.profile_image)} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-white/10">add_a_photo</span>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="text-[11px] font-black uppercase tracking-widest text-[#ffd900] cursor-pointer hover:underline flex items-center gap-2">
                       <span className="material-symbols-outlined text-sm">upload</span> 
                       Subir Nueva Foto
                       <input 
                         type="file" 
                         className="hidden" 
                         accept="image/*" 
                         onChange={(e) => setNewProfileFile(e.target.files?.[0] || null)}
                       />
                    </label>
                    <p className="text-[8px] text-white/30 uppercase mt-1 font-bold">JPG, PNG o WEBP - Máx 2MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Nombre de Usuario *</label>
                    <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-4 py-2 text-white text-xs outline-none focus:border-[#ffd900]" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Correo Electrónico *</label>
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-4 py-2 text-white text-xs outline-none focus:border-[#ffd900]" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Nombres</label>
                    <input type="text" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-4 py-2 text-white text-xs outline-none focus:border-[#ffd900]" placeholder="Ej: Juan" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Apellidos</label>
                    <input type="text" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-4 py-2 text-white text-xs outline-none focus:border-[#ffd900]" placeholder="Ej: Pérez" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">País</label>
                  <select value={newCountryId} onChange={handleCountryChange} className="w-full bg-slate-900 border border-white/10 rounded px-4 py-2 text-white text-xs outline-none focus:border-[#ffd900] appearance-none cursor-pointer">
                    <option value="">-- Selecciona País --</option>
                    {[...countries].sort((a,b) => {
                      if(String(a.id_country) === '1') return -1;
                      if(String(b.id_country) === '1') return 1;
                      if(String(a.id_country) === '2') return 1;
                      if(String(b.id_country) === '2') return -1;
                      return a.name.localeCompare(b.name);
                    }).map(c => <option key={c.id_country} value={c.id_country}>{c.name}</option>)}
                  </select>
                </div>

                {newCountryId === '2' && (
                  <div className="space-y-1 animate-fadeIn">
                    <label className="text-[10px] font-black uppercase text-slate-400">Especificar País</label>
                    <input type="text" value={newCustomCountry} onChange={(e) => setNewCustomCountry(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-4 py-2 text-white text-xs outline-none focus:border-[#ffd900]" placeholder="Ej: Argentina" />
                  </div>
                )}

                {newCountryId === '1' && (
                  <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Región</label>
                      <select value={newRegionId} onChange={handleRegionChange} className="w-full bg-slate-900 border border-white/10 rounded px-4 py-2 text-white text-xs outline-none focus:border-[#ffd900] appearance-none cursor-pointer">
                        <option value="">-- Selecciona --</option>
                        {regions.map(r => <option key={r.id_region} value={r.id_region}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Ciudad/Comuna</label>
                      <select value={newCityId} onChange={(e) => setNewCityId(e.target.value)} disabled={!newRegionId} className="w-full bg-slate-900 border border-white/10 rounded px-4 py-2 text-white text-xs outline-none focus:border-[#ffd900] appearance-none cursor-pointer">
                        <option value="">-- Selecciona --</option>
                        {cities.map(c => <option key={c.id_city} value={c.id_city}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">WhatsApp</label>
                  <input type="tel" value={newWsp} onChange={(e) => setNewWsp(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-4 py-2 text-white text-xs outline-none focus:border-[#ffd900]" placeholder="+569..." />
                </div>

                <div className="space-y-1 pt-2 border-t border-white/5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Cambiar Contraseña (dejar vacío para mantener)</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-4 py-2 text-white text-xs outline-none focus:border-[#ffd900]" placeholder="••••••••" />
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingAccount}
                  className="w-full py-3 bg-[#ffd900] text-[#101622] font-black uppercase rounded mt-4"
                >
                  {isUpdatingAccount ? 'Guardando...' : 'Actualizar Perfil'}
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal de Reclamar Equipo */}
      {
        isClaimModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-[#101622] border border-[#ffd900]/20 rounded-xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#ffd900]/5">
                <h2 className="text-xl font-black uppercase text-white">Reclamar <span className="text-[#ffd900]">Equipo</span></h2>
                <button onClick={() => setIsClaimModalOpen(false)} className="text-white/40 hover:text-white"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-6 bg-[#ffd900]/5 border-b border-white/5">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-sm">search</span>
                  <input
                    type="text"
                    value={searchTermClaim}
                    onChange={(e) => setSearchTermClaim(e.target.value)}
                    placeholder="BUSCAR EQUIPO POR NOMBRE O SIGLA..."
                    className="w-full bg-black/40 border border-white/10 rounded-sm pl-10 pr-4 py-3 text-[10px] font-bold text-white uppercase tracking-widest focus:border-[#ffd900] outline-none"
                  />
                </div>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                {unclaimedTeams.filter(t => 
                  t.name.toLowerCase().includes(searchTermClaim.toLowerCase()) || 
                  t.short_name.toLowerCase().includes(searchTermClaim.toLowerCase())
                ).length > 0 ? (
                  unclaimedTeams.filter(t => 
                    t.name.toLowerCase().includes(searchTermClaim.toLowerCase()) || 
                    t.short_name.toLowerCase().includes(searchTermClaim.toLowerCase())
                  ).map(team => (
                    <div key={team.id} className="flex items-center justify-between p-4 bg-slate-900 border border-white/5 rounded-lg hover:border-[#ffd900]/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded bg-slate-800 p-1">
                          <img src={apiService.resolveImageUrl(team.logo_url)} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <p className="font-bold text-white uppercase text-sm">{team.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{team.short_name} • Est. {team.founded_year}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleClaimTeam(team.id)}
                        className="bg-[#ffd900] text-[#101622] font-black text-[10px] px-4 py-2 rounded uppercase"
                      >
                        Reclamar
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-10 uppercase font-bold text-xs">No hay equipos disponibles para reclamar</p>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Crear Equipo */}
      {
        isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-[#101622] border border-white/10 rounded-xl overflow-hidden shadow-2xl relative">
              {similarityMatch && (() => {
                const isAvailable = !similarityMatch.owner_user_id || similarityMatch.owner_user_id === '0' || similarityMatch.owner_user_id === '';
                return (
                  <div className="absolute inset-0 z-50 flex flex-col justify-between bg-[#101622] p-6 animate-in fade-in duration-200">
                    <div className="space-y-4 my-auto">
                      <div className="size-12 rounded-full bg-[#ffd900]/10 flex items-center justify-center mx-auto text-[#ffd900] mb-2 animate-bounce">
                        <span className="material-symbols-outlined text-2xl font-black">warning</span>
                      </div>
                      <h3 className="text-sm font-black text-center uppercase tracking-widest text-[#ffd900]">
                        Equipo Similar Detectado
                      </h3>
                      <p className="text-xs text-white/70 text-center leading-relaxed">
                        Ya existe un equipo con el nombre o similar: <span className="font-bold text-white">"{similarityMatch.name}"</span>. 
                        ¿No estarás pensando en este equipo?
                      </p>
                      
                      {isAvailable ? (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-sm text-center">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">¡Disponible para Reclamar!</span>
                          <span className="text-[9px] text-white/50 block mt-0.5">Este equipo no tiene un propietario asignado actualmente.</span>
                        </div>
                      ) : (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm text-center">
                          <span className="text-[10px] font-black text-red-400 uppercase tracking-wider block">No disponible para reclamar</span>
                          <span className="text-[9px] text-white/50 block mt-0.5">
                            Este equipo ya está registrado bajo el propietario: <span className="font-bold text-white">{similarityMatch.owner_name || 'Otro usuario'}</span>.
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2.5 mt-4">
                      {isAvailable && (
                        <button
                          type="button"
                          onClick={() => handleCreateTeam(undefined, true, true)}
                          disabled={isSaving}
                          className="w-full py-3 bg-[#ffd900] hover:bg-[#ffed4d] disabled:opacity-50 text-[#101622] text-[10px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm font-black">assignment_ind</span>
                          Reclamar "{similarityMatch.name}"
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCreateTeam(undefined, true, false)}
                        disabled={isSaving}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 rounded-sm"
                      >
                        Continuar y crear "{newTeamName}"
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimilarityMatch(null)}
                        disabled={isSaving}
                        className="w-full py-2.5 text-white/40 hover:text-white disabled:opacity-50 text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        Volver a Editar / Cancelar
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-xl font-black uppercase text-white">Crear Nuevo Equipo</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-white/40 hover:text-white"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Nombre del Equipo</label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded px-4 py-3 text-white outline-none focus:border-[#ffd900]"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Abreviación</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={newShortName}
                      onChange={(e) => setNewShortName(e.target.value.toUpperCase())}
                      className="w-full bg-slate-900 border border-white/10 rounded px-4 py-3 text-white outline-none focus:border-[#ffd900] uppercase"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Año de Fundación</label>
                    <input
                      type="number"
                      value={newFoundedYear}
                      onChange={(e) => setNewFoundedYear(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded px-4 py-3 text-white outline-none focus:border-[#ffd900]"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 bg-[#ffd900] text-[#101622] font-black uppercase rounded mt-4"
                >
                  {isSaving ? 'Creando...' : 'Crear Equipo'}
                </button>
              </form>
            </div>
          </div>
        )
      }

      <ConfirmActionModal
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDangerous={confirmConfig.isDangerous}
          requiresInput={confirmConfig.requiresInput}
          confirmText={confirmConfig.isDangerous ? 'Confirmar Eliminación' : 'Confirmar Acción'}
      />
    </div>
  );
};

export default Profile;
