import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Team } from '../types';
import { checkTeamNameSimilarity } from '../utils/teamSimilarity';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (userId: string) => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    
    // Step 1: Account
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptNewsletter, setAcceptNewsletter] = useState(false);
    
    // Step 2: Personal Info
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [wsp, setWsp] = useState('');

    // Dynamic Location
    const [countries, setCountries] = useState<any[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);

    const [selectedCountryId, setSelectedCountryId] = useState('');
    const [selectedRegionId, setSelectedRegionId] = useState('');
    const [selectedCityId, setSelectedCityId] = useState('');
    
    const [countryName, setCountryName] = useState('');
    const [customCountryName, setCustomCountryName] = useState('');
    const [regionName, setRegionName] = useState('');
    const [communeName, setCommuneName] = useState('');

    // Step 3: Team
    const [teamAction, setTeamAction] = useState<'create' | 'claim'>('create');
    const [teamName, setTeamName] = useState('');
    const [shortName, setShortName] = useState('');
    const [foundedYear, setFoundedYear] = useState(new Date().getFullYear().toString());
    const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');

    const [similarityMatch, setSimilarityMatch] = useState<Team | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            apiService.getCountries().then(setCountries).catch(console.error);
        } else {
            setStep(1);
            setUsername(''); setEmail(''); setPassword('');
            setAcceptNewsletter(false);
            setFirstName(''); setLastName(''); setWsp('');
            setCountryName(''); setCustomCountryName(''); setRegionName(''); setCommuneName('');
            setSelectedCountryId(''); setSelectedRegionId(''); setSelectedCityId('');
            setTeamAction('create'); setTeamName(''); setShortName(''); setSelectedTeamId('');
            setSimilarityMatch(null);
            setError(''); setIsLoading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (step === 3 && teamAction === 'claim' && availableTeams.length === 0) {
            loadUnclaimedTeams();
        }
    }, [step, teamAction]);

    const loadUnclaimedTeams = async () => {
        try {
            const teams = await apiService.getTeams(true);
            setAvailableTeams(teams);
        } catch (err) {
            console.error('Error al cargar equipos:', err);
        }
    };

    const handleCountryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedCountryId(id);
        const cName = countries.find(c => String(c.id_country) === id)?.name || '';
        setCountryName(cName);
        
        setSelectedRegionId(''); setRegionName('');
        setSelectedCityId(''); setCommuneName('');
        setCities([]);

        if (id) {
            const data = await apiService.getRegions(id);
            setRegions(data);
        } else {
            setRegions([]);
        }
    };

    const handleRegionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedRegionId(id);
        const rName = regions.find(r => String(r.id_region) === id)?.name || '';
        setRegionName(rName);
        
        setSelectedCityId(''); setCommuneName('');

        if (id) {
            const data = await apiService.getCities(id);
            setCities(data);
        } else {
            setCities([]);
        }
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedCityId(id);
        const cName = cities.find(c => String(c.id_city) === id)?.name || '';
        setCommuneName(cName);
    };

    if (!isOpen) return null;

    const handleSubmit = async (e?: React.FormEvent, force: boolean = false, claimMatched: boolean = false) => {
        e?.preventDefault();
        
        if (step < 3) {
            // Validation step 2
            const isChile = selectedCountryId === '1';
            const isOther = selectedCountryId === '2';
            if (step === 2) {
                if (!selectedCountryId) {
                    setError("Debes seleccionar un país.");
                    return;
                }
                if (isChile && (!regionName || !communeName)) {
                    setError("Debes seleccionar país, región y comuna.");
                    return;
                }
                if (isOther && !customCountryName.trim()) {
                    setError("Debes escribir el nombre del país.");
                    return;
                }
            }
            setStep(step + 1);
            setError('');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Validar similitud de equipo antes de registrar usuario o equipo
            if (teamAction === 'create' && !force) {
                const allTeams = await apiService.getTeams(false, true);
                const check = checkTeamNameSimilarity(teamName, allTeams);
                if (check.isSimilar && check.matchedTeam) {
                    setSimilarityMatch(check.matchedTeam);
                    setIsLoading(false);
                    return;
                }
            }

            // 1. Create User
            const userResult = await apiService.registerUser({ 
                username, email, password,
                first_name: firstName,
                last_name: lastName,
                country: selectedCountryId,
                custom_country: selectedCountryId === '2' ? customCountryName : null,
                region: selectedRegionId || null,
                commune: selectedCityId || null,
                wsp,
                accept_newsletter: acceptNewsletter ? 1 : 0
            });

            const newUserId = userResult.userId;

            // 2. Handle Team Action
            if (claimMatched && similarityMatch) {
                await apiService.claimTeam(similarityMatch.id, newUserId);
            } else if (teamAction === 'create') {
                await apiService.createTeam({
                    name: teamName,
                    short_name: shortName,
                    founded_year: foundedYear,
                    owner_user_id: newUserId
                });
            } else if (teamAction === 'claim' && selectedTeamId) {
                await apiService.claimTeam(selectedTeamId, newUserId);
            }

            setSimilarityMatch(null);
            onSuccess(newUserId);
            
        } catch (err: any) {
            setError(err.message || 'Error al crear usuario y equipo');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a2332] border border-white/10 rounded-sm w-full max-w-md overflow-hidden shadow-2xl relative">
                {similarityMatch && (() => {
                    const isAvailable = !similarityMatch.owner_user_id || similarityMatch.owner_user_id === '0' || similarityMatch.owner_user_id === '';
                    return (
                        <div className="absolute inset-0 z-50 flex flex-col justify-between bg-[#1a2332] p-6 animate-in fade-in duration-200">
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
                                        onClick={() => handleSubmit(undefined, true, true)}
                                        disabled={isLoading}
                                        className="w-full py-3 bg-[#ffd900] hover:bg-[#ffed4d] disabled:opacity-50 text-[#101622] text-[10px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm font-black">assignment_ind</span>
                                        Reclamar "{similarityMatch.name}"
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(undefined, true, false)}
                                    disabled={isLoading}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 rounded-sm"
                                >
                                    Continuar y crear "{teamName}"
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSimilarityMatch(null)}
                                    disabled={isLoading}
                                    className="w-full py-2.5 text-white/40 hover:text-white disabled:opacity-50 text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                    Volver a Editar / Cancelar
                                </button>
                            </div>
                        </div>
                    );
                })()}

                <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-sm font-black uppercase tracking-widest text-[#ffd900]">
                        {step === 1 ? 'Paso 1: Cuenta' : step === 2 ? 'Paso 2: Datos Personales' : 'Paso 3: Equipo'}
                    </h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex h-1 bg-white/5">
                    <div className="bg-[#ffd900] transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }}></div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border-l-4 border-red-500 p-4 mx-6 mt-4">
                        <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* STEP 1 */}
                    {step === 1 && (
                        <div className="space-y-4 animate-fadeIn">
                            <div>
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Nombre de Usuario *</label>
                                <input required value={username} onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
                                    placeholder="Ej: Tactician99" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Email *</label>
                                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
                                    placeholder="correo@ejemplo.com" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Contraseña *</label>
                                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
                                    placeholder="••••••••" />
                            </div>
                            <div className="flex items-start gap-3 pt-2">
                                <input 
                                    type="checkbox" 
                                    id="acceptNewsletter" 
                                    checked={acceptNewsletter} 
                                    onChange={(e) => setAcceptNewsletter(e.target.checked)}
                                    className="mt-0.5 rounded border-white/10 bg-white/5 text-[#ffd900] focus:ring-[#ffd900] focus:ring-offset-[#1a2332] cursor-pointer"
                                />
                                <label htmlFor="acceptNewsletter" className="text-[10px] font-medium text-white/60 leading-tight select-none cursor-pointer">
                                    Deseo recibir información oficial de <span className="text-white font-bold">Kick On</span> en mi correo electrónico.
                                </label>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Nombre *</label>
                                    <input required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
                                        placeholder="Ej: Juan" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Apellido *</label>
                                    <input required value={lastName} onChange={(e) => setLastName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
                                        placeholder="Ej: Pérez" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">País *</label>
                                <select required value={selectedCountryId} onChange={handleCountryChange}
                                    className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors appearance-none cursor-pointer">
                                    <option value="" className="bg-[#1a2332]">-- Selecciona un País --</option>
                                    {[...countries].sort((a, b) => {
                                        if (String(a.id_country) === '1') return -1;
                                        if (String(b.id_country) === '1') return 1;
                                        if (String(a.id_country) === '2') return 1;
                                        if (String(b.id_country) === '2') return -1;
                                        return a.name.localeCompare(b.name);
                                    }).map(c => <option key={c.id_country} value={c.id_country} className="bg-[#1a2332]">{c.name}</option>)}
                                </select>
                            </div>
                            {selectedCountryId === '2' && (
                                <div className="animate-fadeIn">
                                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Especificar País *</label>
                                    <input required value={customCountryName} onChange={(e) => setCustomCountryName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
                                        placeholder="Ej: Argentina" />
                                </div>
                            )}
                            {selectedCountryId === '1' && (
                                <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                                    <div>
                                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Región *</label>
                                        <select required disabled={!selectedCountryId} value={selectedRegionId} onChange={handleRegionChange}
                                            className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors appearance-none cursor-pointer disabled:opacity-50">
                                            <option value="" className="bg-[#1a2332]">-- Selecciona --</option>
                                            {regions.map(r => <option key={r.id_region} value={r.id_region} className="bg-[#1a2332]">{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Ciudad/Comuna *</label>
                                        <select required disabled={!selectedRegionId} value={selectedCityId} onChange={handleCityChange}
                                            className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors appearance-none cursor-pointer disabled:opacity-50">
                                            <option value="" className="bg-[#1a2332]">-- Selecciona --</option>
                                            {cities.map(c => <option key={c.id_city} value={c.id_city} className="bg-[#1a2332]">{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">WhatsApp *</label>
                                <input required type="tel" value={wsp} onChange={(e) => setWsp(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
                                    placeholder="+569..." />
                            </div>
                        </div>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                        <div className="space-y-4 animate-fadeIn">
                            <p className="text-xs text-white/60 mb-4">Para solicitar tu acceso anticipado al torneo, debes registrar un equipo (creando uno nuevo o reclamando uno existente sin dueño).</p>
                            
                            <div className="flex gap-2 mb-4">
                                {['create', 'claim'].map((action) => (
                                    <button 
                                        key={action} type="button" 
                                        onClick={() => setTeamAction(action as any)}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all border
                                            ${teamAction === action ? 'bg-[#ffd900]/10 border-[#ffd900] text-[#ffd900]' : 'border-white/10 text-white/40 hover:text-white hover:border-white/30'}`}
                                    >
                                        {action === 'create' ? 'Crear Equipo' : 'Reclamar Equipo'}
                                    </button>
                                ))}
                            </div>

                            {teamAction === 'create' && (
                                <div className="space-y-4 p-4 border border-[#ffd900]/20 bg-[#ffd900]/5 rounded-sm">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Nombre Equipo</label>
                                            <input required value={teamName} onChange={(e) => setTeamName(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
                                                placeholder="Ej: Los Galácticos FC" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Siglas (Max 5)</label>
                                            <input required maxLength={5} value={shortName} onChange={(e) => setShortName(e.target.value.toUpperCase())}
                                                className="w-full bg-black/20 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
                                                placeholder="Ej: GAL" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Año de Fundación</label>
                                        <input type="number" value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors" />
                                    </div>
                                </div>
                            )}

                            {teamAction === 'claim' && (
                                <div className="space-y-4 p-4 border border-[#ffd900]/20 bg-[#ffd900]/5 rounded-sm">
                                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Seleccionar Equipo Disponible</label>
                                    <select required value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors appearance-none cursor-pointer"
                                    >
                                        <option value="" className="bg-[#1a2332]">-- Selecciona un equipo --</option>
                                        {availableTeams.map(team => (
                                            <option key={team.id} value={team.id} className="bg-[#1a2332]">{team.name} ({team.founded_year})</option>
                                        ))}
                                    </select>
                                    {availableTeams.length === 0 && (
                                        <p className="text-[9px] text-[#ffd900]/60 mt-2 uppercase">Cargando o no hay equipos sin dueño...</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-4 mt-6">
                        {step > 1 && (
                            <button type="button" onClick={() => setStep(step - 1)} disabled={isLoading}
                                className="w-1/3 py-3 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-widest transition-all rounded-sm">
                                Volver
                            </button>
                        )}
                        <button type="submit" disabled={isLoading}
                            className={`${step > 1 ? 'w-2/3' : 'w-full'} py-3 bg-[#ffd900] hover:bg-[#ffed4d] disabled:opacity-50 disabled:cursor-not-allowed text-[#101622] text-[11px] font-black uppercase tracking-widest transition-all rounded-sm`}>
                            {isLoading ? 'Procesando...' : step < 3 ? 'Siguiente' : 'Finalizar Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateUserModal;
