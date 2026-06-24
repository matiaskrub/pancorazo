import React, { useState } from 'react';
import { apiService } from '../services/api';
import logo from '../assets/logo.png';
import CreateUserModal from '../components/CreateUserModal';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Recuperación de clave
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await apiService.loginUser({ email, password });
      localStorage.setItem('user', JSON.stringify(result.user));
      onLoginSuccess(result.user);
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setIsSendingReset(true);

    try {
      const result = await apiService.requestPasswordReset(resetEmail);
      setResetSuccess(result.message || 'Se ha enviado un enlace de recuperación a tu correo electrónico.');
      setResetEmail('');
    } catch (err: any) {
      setResetError(err.message || 'Error al solicitar el restablecimiento. Verifica el correo ingresado.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleRegisterSuccess = (userId: string) => {
    setIsRegisterOpen(false);
    // Para iniciar sesión automáticamente tras registrarse
    // Hacemos una consulta rápida del perfil del usuario para tener sus datos y guardarlo
    apiService.getUser(userId).then((user) => {
      localStorage.setItem('user', JSON.stringify(user));
      onLoginSuccess(user);
    }).catch(() => {
      // Fallback si falla
      const tempUser: User = {
        id: userId,
        username: 'NuevoUsuario',
        email: email || '',
        global_role: 'PLAYER'
      };
      localStorage.setItem('user', JSON.stringify(tempUser));
      onLoginSuccess(tempUser);
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#060913] relative overflow-hidden px-4 py-12">
      {/* Elementos Decorativos de Fondo (Aesthetic Premium) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#ffd900]/5 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#ffd900]/3 rounded-full blur-[160px] pointer-events-none"></div>

      {/* Patrón de Grilla Futbolera */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#0d1220]/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-8 md:p-10 relative z-10">
        {/* Glow de Borde Superior */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#ffd900]/50 to-transparent"></div>

        {/* Header con Logo */}
        <div className="flex flex-col items-center mb-10 text-center">
          <img
            src={logo}
            alt="Pancorazo TCG"
            className="h-16 w-auto object-contain mb-4 filter drop-shadow-[0_0_15px_rgba(255,217,0,0.2)] hover:scale-105 transition-transform duration-300"
          />
          <h1 className="text-xl font-black uppercase tracking-widest text-white italic">
            ACCESO <span className="text-[#ffd900]">EXCLUSIVO</span>
          </h1>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1.5 max-w-[280px]">
            Inscribiéndote a la <span className="text-[#ffd900]">Copa Pancorazo 2026</span> podrás tener acceso anticipado a la plataforma. ¡Inscríbete ahora!
          </p>
        </div>

        {isForgotPassword ? (
          /* Vista de Recuperar Contraseña */
          <form onSubmit={handleRequestReset} className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-white border-b border-white/5 pb-3">
              Recuperar <span className="text-[#ffd900]">Contraseña</span>
            </h2>

            {resetSuccess && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
                <p className="text-green-400 text-[10px] font-bold uppercase tracking-wider leading-relaxed">{resetSuccess}</p>
              </div>
            )}

            {resetError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider leading-relaxed">{resetError}</p>
              </div>
            )}

            {!resetSuccess && (
              <>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40">Correo Electrónico</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-lg">mail</span>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded px-10 py-3 text-xs font-bold text-white focus:border-[#ffd900] outline-none transition-all placeholder:text-white/10"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full py-4 bg-[#ffd900] hover:bg-[#ffed4d] disabled:opacity-50 text-[#0d1220] font-black uppercase tracking-widest text-[10px] rounded-md transition-all shadow-xl shadow-[#ffd900]/5 flex items-center justify-center gap-2 h-12"
                >
                  {isSendingReset ? (
                    <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">send</span>
                      <span>Enviar Instrucciones</span>
                    </>
                  )}
                </button>
              </>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetSuccess('');
                  setResetError('');
                }}
                className="text-[#ffd900] hover:text-[#ffed4d] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 mx-auto"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Volver al ingreso
              </button>
            </div>
          </form>
        ) : (
          /* Vista de Login Normal */
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest text-center leading-relaxed">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40">Correo Electrónico</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-lg">mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded px-10 py-3.5 text-xs font-bold text-white focus:border-[#ffd900] outline-none transition-all placeholder:text-white/10"
                  placeholder="tu@correo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-[8px] font-black text-[#ffd900]/60 hover:text-[#ffd900] uppercase tracking-widest transition-colors"
                >
                  ¿Olvidaste tu clave?
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-lg">lock</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded px-10 py-3.5 text-xs font-bold text-white focus:border-[#ffd900] outline-none transition-all placeholder:text-white/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#ffd900] hover:bg-[#ffed4d] disabled:opacity-50 text-[#0d1220] font-black uppercase tracking-widest text-[10px] rounded-md transition-all shadow-xl shadow-[#ffd900]/10 flex items-center justify-center h-12"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
              ) : 'INGRESAR A LA PLATAFORMA'}
            </button>

            <div className="pt-6 border-t border-white/5 text-center">
              <p className="text-white/30 text-[8px] font-black uppercase tracking-widest mb-3">¿Aún no tienes una cuenta de acceso?</p>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="w-full py-3 bg-white/5 border border-white/10 hover:border-[#ffd900]/30 text-white/80 hover:text-white rounded-md text-[9px] font-black uppercase tracking-widest transition-all"
              >
                REGÍSTRATE EN EL TORNEO
              </button>
            </div>
          </form>
        )}
      </div>

      <CreateUserModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={handleRegisterSuccess}
      />
    </div>
  );
};

export default Login;
