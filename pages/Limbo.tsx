import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import logo from '../assets/logo.png';
import { User, Team } from '../types';

interface LimboProps {
  user: User;
  onLogout: () => void;
  onStatusUpdate: (user: User) => void;
}

const Limbo: React.FC<LimboProps> = ({ user, onLogout, onStatusUpdate }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [associatedTeam, setAssociatedTeam] = useState<Team | null>(null);
  const [pendingClaim, setPendingClaim] = useState<any | null>(null);

  const loadAssociatedDetails = async () => {
    try {
      // 1. Cargar equipo asociado si el usuario es el owner y está pendiente
      const team = await apiService.getUserTeam(user.id);
      if (team) {
        setAssociatedTeam(team);
      } else {
        // 2. Si no es owner directo activo, buscar en las solicitudes pendientes de reclamo
        const claim = await apiService.getUserPendingClaim(user.id);
        if (claim) {
          setPendingClaim(claim);
        }
      }
    } catch (err) {
      console.error('Error al obtener detalles del equipo en Limbo:', err);
    }
  };

  useEffect(() => {
    loadAssociatedDetails();
  }, [user.id]);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setCheckError('');

    try {
      // Consultar el estado actualizado del usuario en la base de datos
      const updatedUser = await apiService.getUser(user.id);

      if (updatedUser && updatedUser.status !== 'PENDING') {
        // El estado ha cambiado (aprobado o rechazado)
        localStorage.setItem('user', JSON.stringify(updatedUser));
        onStatusUpdate(updatedUser);
      } else {
        // Sigue pendiente
        setCheckError('Tu solicitud aún se encuentra en revisión. Los administradores están validando el pago de tu inscripción.');
      }
    } catch (err: any) {
      setCheckError('Error al conectar con el servidor. Por favor, inténtalo de nuevo.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#060913] relative overflow-hidden px-4 py-12">
      {/* Luces de Estadio y Gradientes de Fondo */}
      <div className="absolute top-[-10%] left-[20%] w-[60%] h-[50%] bg-[#ffd900]/3 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

      <div className="w-full max-w-lg bg-[#0d1220]/80 backdrop-blur-xl border border-[#ffd900]/20 shadow-[0_0_50px_rgba(255,217,0,0.05)] rounded-2xl p-8 md:p-10 relative z-10 text-center">
        {/* Glow animado superior */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#ffd900] to-transparent animate-pulse"></div>

        {/* Logo y Encabezado */}
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Pancorazo" className="h-14 w-auto object-contain mb-4 filter drop-shadow-[0_0_8px_rgba(255,217,0,0.15)]" />
          <div className="size-16 bg-[#ffd900]/10 rounded-full flex items-center justify-center border border-[#ffd900]/20 mb-4 animate-bounce">
            <span className="material-symbols-outlined text-[#ffd900] text-3xl">hourglass_empty</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
            SOLICITUD EN <span className="text-[#ffd900]">ESPERA</span>
          </h1>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em] mt-2 max-w-sm">
            ¡Hola, <span className="text-white">{user.username}</span>! Tu cuenta ha sido registrada en el sistema.
          </p>
        </div>

        {/* Sección Explicativa */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mb-6 text-left space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-[#ffd900] flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            Estado de Inscripción
          </h2>
          <p className="text-xs text-white/70 leading-relaxed font-medium">
            El acceso a la web está restringido temporalmente por el lanzamiento de acceso anticipado.
            Un administrador revisará tu perfil, validará tu participación en el torneo y habilitará tu cuenta.
          </p>

          {/* Detalles del Equipo */}
          {(associatedTeam || pendingClaim) && (
            <div className="pt-4 border-t border-white/5 space-y-2">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40">Equipo Vinculado:</h3>
              {associatedTeam ? (
                <div className="flex items-center gap-3 bg-white/[0.02] border border-[#ffd900]/10 p-3 rounded">
                  <div className="size-10 bg-slate-900 border border-white/10 rounded flex items-center justify-center">
                    {associatedTeam.logo_url ? (
                      <img src={apiService.resolveImageUrl(associatedTeam.logo_url)} alt={associatedTeam.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="material-symbols-outlined text-[#ffd900]">shield</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase">{associatedTeam.name}</h4>
                    <p className="text-[9px] text-[#ffd900]/80 font-black uppercase tracking-wider mt-0.5">CREADO (PENDIENTE APROBACIÓN)</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-white/[0.02] border border-[#ffd900]/10 p-3 rounded">
                  <div className="size-10 bg-slate-900 border border-white/10 rounded flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#ffd900]">pending_actions</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase">{pendingClaim.team_name}</h4>
                    <p className="text-[9px] text-[#ffd900]/80 font-black uppercase tracking-wider mt-0.5">RECLAMADO (PENDIENTE APROBACIÓN)</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {checkError && (
          <div className="p-4 bg-white/5 border-l-4 border-[#ffd900] rounded-r-md text-left mb-6 animate-fadeIn">
            <p className="text-[#ffd900] text-[10px] font-bold uppercase tracking-wider leading-relaxed">{checkError}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full py-4 bg-[#ffd900] hover:bg-[#ffed4d] disabled:opacity-50 text-[#0d1220] font-black uppercase tracking-widest text-[10px] rounded-md transition-all shadow-xl shadow-[#ffd900]/5 flex items-center justify-center gap-2 h-12"
          >
            {isChecking ? (
              <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">sync</span>
                <span>Verificar Estado Actual</span>
              </>
            )}
          </button>

          <button
            onClick={onLogout}
            className="w-full py-3.5 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-white/50 hover:text-red-400 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 h-12"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Cerrar Sesión / Cambiar Cuenta
          </button>
        </div>
      </div>
    </div>
  );
};

export default Limbo;
