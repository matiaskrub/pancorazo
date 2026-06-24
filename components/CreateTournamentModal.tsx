import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Team, User, HighlightRule } from '../types';

interface CreateTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTournamentCreated: () => void;
}

const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({ isOpen, onClose, onTournamentCreated }) => {
    const savedUser = localStorage.getItem('user');
    const currentUser: User | null = savedUser ? JSON.parse(savedUser) : null;
    const isAdmin = currentUser?.global_role === 'SUPER_ADMIN' || currentUser?.global_role === 'ADMIN' || currentUser?.global_role === 'EDITOR';
    
    // Wizard state
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;

    const [name, setName] = useState('');
    const [organizerId, setOrganizerId] = useState('Otros');
    const [isJo, setIsJo] = useState(false);
    const [participantType, setParticipantType] = useState<'individual' | 'squad'>('individual');
    const [structure, setStructure] = useState<'liga' | 'copa' | 'híbrido' | 'suizo'>('liga');
    const [matchFormat, setMatchFormat] = useState<'single' | 'home_away'>('home_away');
    const [registrationStart, setRegistrationStart] = useState('');
    const [registrationEnd, setRegistrationEnd] = useState('');
    const [estimatedStart, setEstimatedStart] = useState('');
    const [prizes, setPrizes] = useState('');
    const [minTeams, setMinTeams] = useState(4);
    const [maxTeams, setMaxTeams] = useState(20);
    const [noLimit, setNoLimit] = useState(false);
    const [hasThirdPlace, setHasThirdPlace] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Nuevos campos estructurales
    const [allowedRegions, setAllowedRegions] = useState<number[]>([]);
    const [isInvitational, setIsInvitational] = useState(false);
    const [tournamentType, setTournamentType] = useState<'pichanga' | 'barrio' | 'ascenso' | 'oro'>('barrio');
    const [competitivenessLevel, setCompetitivenessLevel] = useState<'semiprofesional' | 'profesional'>('semiprofesional');
    const [highlightSettings, setHighlightSettings] = useState<HighlightRule[]>([]);
    
    const [regions, setRegions] = useState<any[]>([]);
    
    // Legacy support
    const [isLegacy, setIsLegacy] = useState(false);
    const [championId, setChampionId] = useState('');
    const [teams, setTeams] = useState<Team[]>([]);

    useEffect(() => {
        if (isLegacy && teams.length === 0) {
            apiService.getTeams(false, true, undefined, true).then(setTeams).catch(console.error);
        }
    }, [isLegacy, teams.length]);

    useEffect(() => {
        if (isOpen) {
            apiService.getRegions().then(setRegions).catch(console.error);
            setCurrentStep(1); // Reset step on open
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && !isAdmin) {
            setOrganizerId('Otros');
            setTournamentType('pichanga');
        }
    }, [isOpen, isAdmin]);

    // Intelligent Presets
    useEffect(() => {
        if (structure === 'copa') {
            setMinTeams(4); setMaxTeams(16); setMatchFormat('single'); setHasThirdPlace(false); setNoLimit(false);
        } else if (structure === 'liga') {
            setMinTeams(4); setMaxTeams(20); setMatchFormat('home_away'); setHasThirdPlace(false); setNoLimit(false);
        } else if (structure === 'suizo') {
            setMinTeams(8); setMaxTeams(64); setMatchFormat('single'); setHasThirdPlace(false); setNoLimit(false);
        } else if (structure === 'híbrido') {
            setMinTeams(16); setMaxTeams(32); setMatchFormat('single'); setHasThirdPlace(true); setNoLimit(false);
        }
    }, [structure]);

    const canSubmitStep = () => {
        if (currentStep === 1) {
            return name.trim() !== '';
        }
        if (currentStep === 2) {
            if (isLegacy) return championId !== '';
            return true; // format has defaults
        }
        if (currentStep === 3) {
            return estimatedStart !== '';
        }
        return true;
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiService.createTournament({
                name,
                organizer_id: organizerId || undefined,
                is_jo: isJo ? 1 : 0,
                participant_type: participantType,
                structure,
                match_format: matchFormat,
                registration_start: registrationStart || undefined,
                registration_end: registrationEnd || undefined,
                start_date: estimatedStart || undefined,
                prizes: prizes || undefined,
                min_teams: minTeams,
                max_teams: noLimit ? 99 : maxTeams,
                has_third_place: hasThirdPlace ? 1 : 0,
                champion_id: championId || undefined,
                status: 'draft',
                action: 'create',
                highlight_settings: highlightSettings,
                region_id: allowedRegions.length === 1 ? allowedRegions[0] : null,
                allowed_regions: allowedRegions,
                is_invitational: isInvitational ? 1 : 0,
                tournament_type: tournamentType,
                competitiveness_level: competitivenessLevel,
                is_legacy: isLegacy,
                legacy: isLegacy ? 1 : 0
            });
            onTournamentCreated();
            onClose();
            // Reset form
            setName(''); setOrganizerId('Otros'); setIsJo(false); setParticipantType('individual');
            setStructure('liga'); setMatchFormat('home_away'); setRegistrationStart(''); setRegistrationEnd('');
            setEstimatedStart(''); setPrizes(''); setMinTeams(4); setMaxTeams(20); setNoLimit(false);
            setHasThirdPlace(false); setChampionId(''); setHighlightSettings([]); setAllowedRegions([]); setIsInvitational(false);
            setTournamentType('barrio'); setCompetitivenessLevel('semiprofesional'); setIsLegacy(false); setCurrentStep(1);
        } catch (error) {
            console.error('Error al crear torneo:', error);
            alert('Error al crear el torneo. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (canSubmitStep() && currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };



    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-[#0d121f] border border-white/10 w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header Estilo Premium */}
                <div className="p-6 border-b border-white/5 relative shrink-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffd900] to-transparent"></div>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <div className="flex items-center gap-2 text-[#ffd900] mb-2">
                                <span className="h-[1px] w-8 bg-[#ffd900]"></span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Asistente de Creación</span>
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Nuevo Torneo</h2>
                        </div>
                        <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                    {/* Progress Bar */}
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(step => (
                            <div key={step} className={`h-1 flex-1 transition-all ${currentStep >= step ? 'bg-[#ffd900]' : 'bg-white/10'}`}></div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <form id="tournament-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* PASO 1: INFORMACIÓN BÁSICA */}
                        {currentStep === 1 && (
                            <div className="space-y-4 animate-fade-in">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Paso 1: Información Básica</h3>
                                
                                {currentUser?.global_role === 'SUPER_ADMIN' && (
                                    <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 group transition-all hover:border-[#ffd900]/30 mb-2">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                id="is_legacy"
                                                checked={isLegacy}
                                                onChange={(e) => setIsLegacy(e.target.checked)}
                                                className=" peer appearance-none size-6 border-2 border-white/10 rounded-sm bg-transparent checked:bg-[#ffd900] checked:border-[#ffd900] transition-all cursor-pointer"
                                            />
                                            <span className="material-symbols-outlined absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-black text-sm left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold transition-opacity">check</span>
                                        </div>
                                        <label htmlFor="is_legacy" className="flex-1 cursor-pointer">
                                            <div className="text-[11px] font-black text-[#ffd900] uppercase tracking-tighter leading-none">Torneo Histórico (Legacy)</div>
                                            <div className="text-[9px] text-white/40 uppercase mt-1">Registrar un torneo del pasado que ya finalizó.</div>
                                        </label>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Nombre del Torneo</label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ej: Copa de Verano 2026"
                                        className="w-full bg-white/5 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all placeholder:text-white/10"
                                    />
                                </div>

                                {isAdmin ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 items-start">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Regiones Permitidas (Vacío = Global)</label>
                                                <div className="w-full max-h-36 overflow-y-auto bg-white/5 border border-white/10 p-3 rounded-sm space-y-2 custom-scrollbar">
                                                    {regions.map(r => {
                                                        const isChecked = allowedRegions.includes(r.id_region);
                                                        return (
                                                            <div key={r.id_region} className="flex items-center gap-3 py-1 group cursor-pointer" onClick={() => {
                                                                if (isChecked) {
                                                                    setAllowedRegions(allowedRegions.filter(id => id !== r.id_region));
                                                                } else {
                                                                    setAllowedRegions([...allowedRegions, r.id_region]);
                                                                }
                                                            }}>
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        readOnly
                                                                        className="appearance-none size-4 border border-white/20 rounded-sm bg-transparent checked:bg-[#ffd900] checked:border-[#ffd900] transition-all cursor-pointer"
                                                                    />
                                                                    {isChecked && (
                                                                        <span className="material-symbols-outlined absolute pointer-events-none text-black text-[10px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold">check</span>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs text-white/70 group-hover:text-white uppercase tracking-wider select-none">{r.name}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 group transition-all hover:border-[#ffd900]/30 h-[66px]">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            id="is_jo"
                                                            checked={isJo}
                                                            onChange={(e) => setIsJo(e.target.checked)}
                                                            className=" peer appearance-none size-6 border-2 border-white/10 rounded-sm bg-transparent checked:bg-[#ffd900] checked:border-[#ffd900] transition-all cursor-pointer"
                                                        />
                                                        <span className="material-symbols-outlined absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-black text-sm left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold transition-opacity">check</span>
                                                    </div>
                                                    <label htmlFor="is_jo" className="flex-1 cursor-pointer">
                                                        <div className="text-[11px] font-black text-white uppercase tracking-tighter leading-none">Juego Organizado (JO)</div>
                                                        <div className="text-[9px] text-white/40 uppercase mt-1">Aporta al Ranking Oficial.</div>
                                                    </label>
                                                </div>

                                                <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 group transition-all hover:border-[#ffd900]/30 h-[66px]">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            id="is_invitational"
                                                            checked={isInvitational}
                                                            onChange={(e) => setIsInvitational(e.target.checked)}
                                                            className=" peer appearance-none size-6 border-2 border-white/10 rounded-sm bg-transparent checked:bg-[#ffd900] checked:border-[#ffd900] transition-all cursor-pointer"
                                                        />
                                                        <span className="material-symbols-outlined absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-black text-sm left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold transition-opacity">check</span>
                                                    </div>
                                                    <label htmlFor="is_invitational" className="flex-1 cursor-pointer">
                                                        <div className="text-[11px] font-black text-white uppercase tracking-tighter leading-none">Invitacional</div>
                                                        <div className="text-[9px] text-white/40 uppercase mt-1">No rompe racha a no participantes.</div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Tipo de Torneo</label>
                                                <select
                                                    value={tournamentType}
                                                    onChange={(e) => setTournamentType(e.target.value as any)}
                                                    className="w-full bg-white/5 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all appearance-none"
                                                >
                                                    <option value="pichanga" className="bg-[#0d121f]">Pichanga (Amistoso)</option>
                                                    <option value="barrio" className="bg-[#0d121f]">Torneo de Barrio</option>
                                                    <option value="ascenso" className="bg-[#0d121f]">Copa de Ascenso</option>
                                                    <option value="oro" className="bg-[#0d121f]">Copa de Oro</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Nivel de Competitividad</label>
                                                <select
                                                    value={competitivenessLevel}
                                                    onChange={(e) => setCompetitivenessLevel(e.target.value as any)}
                                                    className="w-full bg-white/5 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all appearance-none"
                                                >
                                                    <option value="semiprofesional" className="bg-[#0d121f]">Semiprofesional</option>
                                                    <option value="profesional" className="bg-[#0d121f]">Profesional</option>
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        )}

                        {/* PASO 2: FORMATO */}
                        {currentStep === 2 && (
                            <div className="space-y-4 animate-fade-in">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Paso 2: Formato y Estructura</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Estructura Base</label>
                                        <select
                                            value={structure}
                                            onChange={(e) => setStructure(e.target.value as any)}
                                            className="w-full bg-white/5 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all appearance-none"
                                        >
                                            <option value="liga" className="bg-[#0d121f]">Liga</option>
                                            <option value="copa" className="bg-[#0d121f]">Copa</option>
                                            <option value="híbrido" className="bg-[#0d121f]">Híbrido (Grupos + Playoffs)</option>
                                            <option value="suizo" className="bg-[#0d121f]">Suizo</option>
                                        </select>
                                    </div>
                                    {!isLegacy && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Participantes</label>
                                            <select
                                                value={participantType}
                                                onChange={(e) => setParticipantType(e.target.value as any)}
                                                className="w-full bg-white/5 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all appearance-none"
                                            >
                                                <option value="individual" className="bg-[#0d121f]">Individual</option>
                                                <option value="squad" className="bg-[#0d121f]">Squad / Clan</option>
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {!isLegacy ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Formato Partido</label>
                                                <select
                                                    value={matchFormat}
                                                    onChange={(e) => setMatchFormat(e.target.value as any)}
                                                    className="w-full bg-white/5 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all appearance-none"
                                                >
                                                    <option value="single" className="bg-[#0d121f]">Partido Único</option>
                                                    <option value="home_away" className="bg-[#0d121f]">Ida y Vuelta</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Equipos Mín</label>
                                                <input
                                                    type="number"
                                                    value={minTeams}
                                                    onChange={(e) => setMinTeams(parseInt(e.target.value) || 2)}
                                                    className="w-full bg-white/5 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Equipos Máx</label>
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={noLimit}
                                                        onChange={(e) => setNoLimit(e.target.checked)}
                                                        className="size-3 accent-[#ffd900]"
                                                    />
                                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Sin máximo</span>
                                                </label>
                                            </div>
                                            <input
                                                type="number"
                                                disabled={noLimit}
                                                value={noLimit ? '' : maxTeams}
                                                onChange={(e) => setMaxTeams(parseInt(e.target.value) || 16)}
                                                placeholder={noLimit ? '∞' : ''}
                                                className={`w-full bg-white/5 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all ${noLimit ? 'opacity-30 cursor-not-allowed' : ''}`}
                                            />
                                        </div>

                                        {(structure === 'copa' || structure === 'híbrido') && (
                                            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 group transition-all hover:border-[#ffd900]/30">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id="has_third_place"
                                                        checked={hasThirdPlace}
                                                        onChange={(e) => setHasThirdPlace(e.target.checked)}
                                                        className=" peer appearance-none size-6 border-2 border-white/10 rounded-sm bg-transparent checked:bg-[#ffd900] checked:border-[#ffd900] transition-all cursor-pointer"
                                                    />
                                                    <span className="material-symbols-outlined absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-black text-sm left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold transition-opacity">check</span>
                                                </div>
                                                <label htmlFor="has_third_place" className="flex-1 cursor-pointer">
                                                    <div className="text-[11px] font-black text-white uppercase tracking-tighter leading-none">Disputar 3er Puesto</div>
                                                    <div className="text-[9px] text-white/30 uppercase mt-1">Genera un partido extra entre perdedores de semis</div>
                                                </label>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="space-y-1.5 mt-4">
                                        <label className="text-[10px] font-black text-[#ffd900] uppercase tracking-widest ml-1">Equipo Campeón</label>
                                        <select
                                            required
                                            value={championId}
                                            onChange={(e) => setChampionId(e.target.value)}
                                            className="w-full bg-[#121926] border border-[#ffd900]/30 p-4 text-[#ffd900] font-bold text-sm focus:outline-none focus:border-[#ffd900] transition-all"
                                        >
                                            <option value="">Seleccionar al campeón registrado...</option>
                                            {teams.map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name} {t.status && t.status.toLowerCase() !== 'activo' && t.status.toLowerCase() !== 'active' ? `(${t.status})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[9px] text-white/40 pt-1 ml-1 uppercase">El torneo se registrará instantáneamente como finalizado adjudicándole el palmarés a este equipo.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PASO 3: FECHAS Y REGLAS */}
                        {currentStep === 3 && (
                            <div className="space-y-4 animate-fade-in">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Paso 3: Fechas y Reglas</h3>
                                
                                {!isLegacy && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Inicio Inscripciones</label>
                                            <input
                                                type="date"
                                                value={registrationStart}
                                                onChange={(e) => setRegistrationStart(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all [color-scheme:dark]"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Fin Inscripciones</label>
                                            <input
                                                type="date"
                                                value={registrationEnd}
                                                min={registrationStart} // Validacion dinamica
                                                onChange={(e) => setRegistrationEnd(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                                        {isLegacy ? 'Fecha del Torneo (Histórico)' : 'Inicio Estimado del Torneo'}
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={estimatedStart}
                                        min={!isLegacy ? registrationEnd : undefined} // Validacion dinamica
                                        onChange={(e) => setEstimatedStart(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all [color-scheme:dark]"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Premios</label>
                                    <textarea
                                        value={prizes}
                                        onChange={(e) => setPrizes(e.target.value)}
                                        placeholder="Describa los premios..."
                                        className="w-full bg-white/5 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all h-20 resize-none"
                                    />
                                </div>

                                 {/* JO checkbox fue movido al Paso 1 */}
                            </div>
                        )}

                        {/* PASO 4: PERSONALIZACIÓN */}
                        {currentStep === 4 && (
                            <div className="space-y-4 animate-fade-in">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Paso 4: Personalización</h3>
                                
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-[#ffd900] uppercase tracking-widest">Resaltado de Posiciones en Tabla</label>
                                    <button
                                        type="button"
                                        onClick={() => setHighlightSettings([...highlightSettings, { start: 1, end: 1, color: '#ffd900', textColor: '#000000' }])}
                                        className="text-[9px] font-black text-white/40 hover:text-[#ffd900] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Nueva Regla
                                    </button>
                                </div>
                                
                                {highlightSettings.length === 0 ? (
                                    <p className="text-[9px] text-white/20 uppercase text-center py-6 border border-dashed border-white/5 italic bg-white/5">
                                        Usando resaltado por defecto (Solo #1 en Amarillo)
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {highlightSettings.map((rule, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-white/5 p-3 border border-white/5 group">
                                                <div className="flex-1 grid grid-cols-4 gap-2">
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-tighter">Desde Pos.</p>
                                                        <input 
                                                            type="number" 
                                                            value={rule.start} 
                                                            onChange={(e) => {
                                                                const newSettings = [...highlightSettings];
                                                                newSettings[idx].start = parseInt(e.target.value) || 1;
                                                                setHighlightSettings(newSettings);
                                                            }}
                                                            className="w-full bg-black/40 border border-white/10 p-1.5 text-white text-[10px] focus:outline-none focus:border-[#ffd900]"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-tighter">Hasta Pos.</p>
                                                        <input 
                                                            type="number" 
                                                            value={rule.end} 
                                                            onChange={(e) => {
                                                                const newSettings = [...highlightSettings];
                                                                newSettings[idx].end = parseInt(e.target.value) || 1;
                                                                setHighlightSettings(newSettings);
                                                            }}
                                                            className="w-full bg-black/40 border border-white/10 p-1.5 text-white text-[10px] focus:outline-none focus:border-[#ffd900]"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-tighter">Color Fondo</p>
                                                        <input 
                                                            type="color" 
                                                            value={rule.color} 
                                                            onChange={(e) => {
                                                                const newSettings = [...highlightSettings];
                                                                newSettings[idx].color = e.target.value;
                                                                setHighlightSettings(newSettings);
                                                            }}
                                                            className="w-full h-7 bg-black/40 border border-white/10 p-0.5"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-tighter">Color Texto</p>
                                                        <input 
                                                            type="color" 
                                                            value={rule.textColor || '#000000'} 
                                                            onChange={(e) => {
                                                                const newSettings = [...highlightSettings];
                                                                newSettings[idx].textColor = e.target.value;
                                                                setHighlightSettings(newSettings);
                                                            }}
                                                            className="w-full h-7 bg-black/40 border border-white/10 p-0.5"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setHighlightSettings(highlightSettings.filter((_, i) => i !== idx))}
                                                    className="size-7 flex items-center justify-center text-white/20 hover:text-red-500 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                        <p className="text-[8px] text-white/30 uppercase mt-2">
                                            * Usa números negativos para posiciones desde el final (ej: -1 es el último lugar).
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer Navegación */}
                <div className="p-6 border-t border-white/5 flex gap-4 shrink-0">
                    <button
                        type="button"
                        onClick={currentStep > 1 ? prevStep : onClose}
                        className="flex-1 py-4 border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all"
                    >
                        {currentStep > 1 ? 'Anterior' : 'Cancelar'}
                    </button>
                    
                    {currentStep < totalSteps ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            disabled={!canSubmitStep()}
                            className={`flex-1 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${!canSubmitStep() ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-[#121926] text-[#ffd900] border border-[#ffd900]/30 hover:border-[#ffd900]'}`}
                        >
                            Siguiente
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    ) : (
                        <button
                            type="submit"
                            form="tournament-form"
                            disabled={loading || !canSubmitStep()}
                            className={`flex-[2] py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${loading || !canSubmitStep()
                                ? 'bg-white/5 text-white/10 cursor-not-allowed'
                                : 'bg-[#ffd900] text-black hover:scale-[1.02] shadow-[0_0_30px_rgba(255,217,0,0.15)]'
                                }`}
                        >
                            {loading ? (
                                <div className="size-4 border-2 border-black/20 border-t-black animate-spin rounded-full"></div>
                            ) : (
                                <span className="material-symbols-outlined text-lg">emoji_events</span>
                            )}
                            Crear Torneo
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateTournamentModal;
