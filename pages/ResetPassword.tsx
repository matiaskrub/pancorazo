import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // Estados de validación del token
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [validationError, setValidationError] = useState('');

  // Estados del formulario
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados de envío
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Validaciones en tiempo real
  const isLengthValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && confirmPassword !== '';
  const isFormValid = isLengthValid && passwordsMatch;

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationError('Token de seguridad no proporcionado.');
        setIsValidating(false);
        return;
      }

      try {
        const result = await apiService.verifyResetToken(token);
        if (result.status === 'success') {
          setIsValidToken(true);
          setUserEmail(result.email || '');
        } else {
          setValidationError(result.error || 'El enlace de recuperación es inválido.');
        }
      } catch (err: any) {
        setValidationError(err.message || 'El enlace de recuperación ha expirado o es inválido.');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !token) return;

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const result = await apiService.resetPassword(token, password);
      if (result.status === 'success') {
        setSubmitSuccess(true);
        setSubmitMessage(result.message || '¡Tu contraseña ha sido restablecida con éxito!');
      } else {
        setSubmitMessage(result.error || 'Error al restablecer la contraseña.');
      }
    } catch (err: any) {
      setSubmitMessage(err.message || 'Error de red al procesar tu solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16 bg-[#0a0f1a]">
      <div className="w-full max-w-md bg-[#101622] border border-[#ffd900]/20 rounded-xl overflow-hidden shadow-2xl relative">
        {/* Barra brillante superior animada */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffd900] to-transparent animate-pulse"></div>

        {isValidating ? (
          /* Pantalla de Carga de Validación */
          <div className="p-12 text-center space-y-6">
            <span className="material-symbols-outlined text-5xl text-[#ffd900] animate-spin">
              security
            </span>
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase text-white tracking-wide">Verificando Seguridad</h3>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                Validando token de restauración criptográfico...
              </p>
            </div>
          </div>
        ) : !isValidToken ? (
          /* Pantalla de Token Inválido/Expirado */
          <div className="p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <span className="material-symbols-outlined text-6xl text-red-500 animate-bounce">
              gpp_bad
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Enlace <span className="text-[#ffd900]">Inválido</span></h2>
              <p className="text-red-400 text-[11px] font-bold uppercase tracking-wider leading-relaxed px-4">
                {validationError}
              </p>
            </div>
            
            <div className="pt-6 border-t border-white/5 space-y-3">
              <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">
                ¿Necesitas restaurar tu cuenta?
              </p>
              <button
                onClick={() => navigate('/profile')}
                className="px-6 py-3 bg-[#ffd900] hover:bg-[#ffed4d] text-black rounded-sm text-[10px] font-black uppercase tracking-widest transition-all w-full shadow-lg shadow-[#ffd900]/10 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">lock_reset</span>
                SOLICITAR NUEVO ENLACE
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all w-full"
              >
                IR AL INICIO
              </button>
            </div>
          </div>
        ) : submitSuccess ? (
          /* Pantalla de Restablecimiento Exitoso */
          <div className="p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <span className="material-symbols-outlined text-6xl text-green-500 animate-pulse">
              verified
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Clave <span className="text-green-500">Actualizada</span></h2>
              <p className="text-green-400 text-[11px] font-bold uppercase tracking-wider leading-relaxed px-4">
                {submitMessage}
              </p>
            </div>

            <div className="pt-6 border-t border-white/5">
              <button
                onClick={() => navigate('/profile')}
                className="px-6 py-4 bg-[#ffd900] hover:bg-[#ffed4d] text-black rounded-sm text-xs font-black uppercase tracking-widest transition-all w-full shadow-xl shadow-[#ffd900]/10 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                INICIAR SESIÓN AHORA
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Restablecimiento de Contraseña */
          <>
            <div className="p-8 border-b border-white/5 text-center">
              <span className="material-symbols-outlined text-5xl text-[#ffd900] mb-2">lock_open</span>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Nueva <span className="text-[#ffd900]">Contraseña</span></h2>
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">
                Establece la nueva clave de acceso para <span className="text-white">{userEmail}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5 animate-in fade-in duration-300">
              {submitMessage && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 animate-in fade-in duration-300">
                  <span className="material-symbols-outlined text-red-500 text-lg mt-0.5">error</span>
                  <p className="text-red-400 text-[11px] font-bold uppercase tracking-wider leading-relaxed">{submitMessage}</p>
                </div>
              )}

              {/* Input Contraseña */}
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd900]">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded px-4 py-3 text-sm font-bold text-white focus:border-[#ffd900] outline-none transition-all placeholder:text-white/10 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Input Confirmar Contraseña */}
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd900]">Confirmar Contraseña</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded px-4 py-3 text-sm font-bold text-white focus:border-[#ffd900] outline-none transition-all placeholder:text-white/10 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Indicadores de Validación Dinámica (Premium Feedback) */}
              <div className="p-4 bg-slate-900/50 border border-white/5 rounded-lg space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-sm transition-colors ${isLengthValid ? 'text-green-500' : 'text-white/20'}`}>
                    {isLengthValid ? 'check_circle' : 'circle'}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${isLengthValid ? 'text-green-400' : 'text-white/30'}`}>
                    Mínimo 6 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-sm transition-colors ${passwordsMatch ? 'text-green-500' : 'text-white/20'}`}>
                    {passwordsMatch ? 'check_circle' : 'circle'}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${passwordsMatch ? 'text-green-400' : 'text-white/30'}`}>
                    Las contraseñas coinciden
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full py-4 bg-[#ffd900] hover:bg-[#ffed4d] disabled:bg-[#ffd900]/20 text-[#101622] font-black uppercase tracking-tighter rounded-sm transition-all shadow-xl shadow-[#ffd900]/10 mt-6 h-[56px] flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">check</span>
                    <span>RESTABLECER CONTRASEÑA</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
