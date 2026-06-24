
import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0a0f1a] border-t border-white/5 py-20 px-4 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-20">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2 group">
                <img
                  src={logo}
                  alt="Pancorazo"
                  className="h-20 w-auto object-contain brightness-110 hover:scale-105 transition-transform duration-300"
                />
              </Link>
            </div>
            <p className="text-xs text-white/40 leading-relaxed font-medium uppercase tracking-wider max-w-[280px]">
              La plataforma oficial del juego de cartas coleccionables de fútbol Kick On. Construye tu legado, gana trofeos y únete a los inmortales en el Palmarés.
            </p>
            <div className="flex gap-4">
              <a href="https://www.kickon.cl" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors group" title="Web">
                <span className="material-symbols-outlined text-white/60 group-hover:text-white text-lg">public</span>
              </a>
              <a href="https://www.instagram.com/pancorazo" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors group" title="Instagram">
                <svg className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="https://discord.gg/9vxFrDY8" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors group" title="Discord">
                <svg className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2758-3.68-.2758-5.4868 0-.1636-.3903-.4054-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 00-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 00.0254-.0852c3.9312 1.8023 8.2103 1.8023 12.0968 0a.074.074 0 00.0254.0852c.12.0991.2459.1971.3718.2913a.077.077 0 00-.0066.1278 12.5593 12.5593 0 01-1.8721.8923.0763.0763 0 00-.0416.1057c.353.699.7644 1.3638 1.226 1.9942a.0775.0775 0 00.0842.0276c1.9593-.6066 3.9479-1.5218 5.9962-3.0294a.0774.0774 0 00.0313-.056c.5003-5.1757-.8382-9.6739-3.5485-13.6604a.0683.0683 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ffd900] mb-8">ENLACES DEL JUEGO</h4>
            <ul className="flex flex-col gap-4">
              {[
                { name: 'Web Oficial', path: 'https://www.kickon.cl/', external: true },
                { name: 'Reglamento', path: '/documentos/RKO.pdf', external: true },
                { name: 'Erratas', path: '/documentos/Erratas.pdf', external: true },
                { name: 'Juego Organizado (JO)', path: '/documentos/JO.pdf', external: true },
                { name: 'Base de Datos', path: '/library', external: false }
              ].map(link => (
                <li key={link.name}>
                  {link.external ? (
                    <a href={link.path} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-wider">{link.name}</a>
                  ) : (
                    <Link to={link.path} className="text-[11px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-wider">{link.name}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ffd900] mb-8">COMUNIDAD</h4>
            <ul className="flex flex-col gap-4">
              {[
                { name: 'Centro de Torneos', path: '/tournaments', external: false },
                { name: 'Ranking de Jugadores', path: '/rankings', external: false },
                { name: 'Comunidad de Discord', path: 'https://discord.gg/9vxFrDY8', external: true },
                { name: 'Whatsapp Comunidad', path: 'https://chat.whatsapp.com/HbrEcw8sfud9juok9QBLcE', external: true }
              ].map(link => (
                <li key={link.name}>
                  {link.external ? (
                    <a href={link.path} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-wider">{link.name}</a>
                  ) : (
                    <Link to={link.path} className="text-[11px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-wider">{link.name}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t border-white/5">
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
            © 2026 PANCORAZO • TODOS LOS DERECHOS RESERVADOS
          </p>
          <div className="flex items-center gap-8">
            <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">Desarrollado por</span>
            <span className="text-[10px] text-[#ffd900] font-black uppercase tracking-widest">Atrevido</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
