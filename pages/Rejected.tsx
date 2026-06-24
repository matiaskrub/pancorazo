import React from 'react';
import logo from '../assets/logo.png';
import { User } from '../types';

interface RejectedProps {
  user: User;
  onLogout: () => void;
}

const Rejected: React.FC<RejectedProps> = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#060913] relative overflow-hidden px-4 py-12">
      {/* Elementos Decorativos de Fondo */}
      <div className="absolute top-[-10%] left-[20%] w-[60%] h-[50%] bg-red-500/3 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

      <div className="w-full max-w-lg bg-[#0d1220]/80 backdrop-blur-xl border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.05)] rounded-2xl p-8 md:p-10 relative z-10 text-center">
        {/* Glow animado superior */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>

        {/* Logo y Encabezado */}
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Pancorazo" className="h-14 w-auto object-contain mb-4 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.15)]" />
          <div className="size-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mb-4 animate-pulse">
            <span className="material-symbols-outlined text-red-500 text-3xl">cancel</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
            SOLICITUD <span className="text-red-500">RECHAZADA</span>
          </h1>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em] mt-2 max-w-sm">
            Lo sentimos, <span className="text-white">{user.username}</span>.
          </p>
        </div>

        {/* Sección Explicativa */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mb-8 text-left space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            Acceso Denegado
          </h2>
          <p className="text-xs text-white/70 leading-relaxed font-medium">
            Tu solicitud para participar en la fase de acceso anticipado ha sido rechazada por el equipo de administración. 
            Esto puede deberse a que tus datos no coinciden con las inscripciones oficiales al torneo.
          </p>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide">
            Si crees que esto es un error, por favor ponte en contacto con los organizadores del torneo.
          </p>
        </div>

        {/* Acciones */}
        <button
          onClick={onLogout}
          className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-md transition-all shadow-xl shadow-red-500/10 flex items-center justify-center gap-2 h-12"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Cerrar Sesión / Salir
        </button>
      </div>
    </div>
  );
};

export default Rejected;
