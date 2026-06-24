import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { formatLocalDate } from '../utils/formatters';
import { Noticia, User } from '../types';
import AddNewsModal from '../components/AddNewsModal';

const NoticiaDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [noticia, setNoticia] = useState<Noticia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const savedUser = localStorage.getItem('user');
  const currentUser: User | null = savedUser ? JSON.parse(savedUser) : null;
  const isAdmin = currentUser?.global_role === 'SUPER_ADMIN' || currentUser?.global_role === 'ADMIN';

  useEffect(() => {
    if (id) {
      loadNoticia(id);
    }
  }, [id]);

  const loadNoticia = async (newsId: string) => {
    setLoading(true);
    try {
      const data = await apiService.getNoticiaById(newsId);
      setNoticia(data);
    } catch (err) {
      console.error('Error loading news detail:', err);
      setError('No se pudo cargar la noticia.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd900]"></div>
      </div>
    );
  }

  if (error || !noticia) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center gap-6">
        <h2 className="text-2xl font-black uppercase italic text-white">{error || 'Noticia no encontrada'}</h2>
        <Link to="/novedades" className="px-8 py-3 bg-[#ffd900] text-black font-black uppercase tracking-widest rounded-sm">
          VOLVER A NOVEDADES
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] pb-32 relative">
      {/* Botón de Edición para Administradores */}
      {isAdmin && (
        <div className="fixed bottom-10 right-10 z-50">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-3 px-6 py-4 bg-[#ffd900] text-black rounded-full font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all active:scale-95 group"
          >
            <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">edit_square</span>
            EDITAR NOTICIA
          </button>
        </div>
      )}

      {/* 1. HEADER EDITORIAL */}
      <header className="px-4 md:px-10 pt-20 pb-12 max-w-5xl mx-auto flex flex-col items-center text-center">
        <Link to="/novedades" className="flex items-center gap-2 text-[#ffd900] text-[10px] font-black uppercase tracking-widest mb-8 hover:gap-3 transition-all">
          <span className="material-symbols-outlined text-sm">arrow_back</span> VOLVER A NOVEDADES
        </Link>
        <span className="px-3 py-1 bg-white/5 border border-white/10 text-[#ffd900] text-[10px] font-black uppercase tracking-[0.2em] mb-6">
          {noticia.categoria} • {formatLocalDate(noticia.fecha)}
        </span>
        <h1 className="text-4xl md:text-7xl font-black uppercase italic leading-[1] tracking-tighter text-white mb-8">
          {noticia.titular}
        </h1>
        <p className="text-lg md:text-2xl text-white/60 font-medium leading-relaxed max-w-3xl italic">
          {noticia.bajada}
        </p>
      </header>

      {/* 2. IMAGEN PRINCIPAL */}
      <section className="px-4 md:px-10 max-w-6xl mx-auto mb-16">
        <div className="w-full aspect-[21/9] rounded-sm overflow-hidden border border-white/5 shadow-2xl shadow-black/50">
          <img src={apiService.resolveImageUrl(noticia.foto)} alt={noticia.titular} className="w-full h-full object-cover" />
        </div>
      </section>

      {/* 3. CONTENIDO DEL TEXTO */}
      <article className="px-6 max-w-3xl mx-auto text-white/80">
        <div 
          className="prose prose-invert prose-yellow max-w-none text-base md:text-lg leading-loose font-medium"
          dangerouslySetInnerHTML={{ __html: noticia.texto }}
        />
        
        {/* Separador */}
        <div className="mt-20 pt-10 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Compartir:</span>
            <div className="flex gap-2">
              <button className="size-8 rounded bg-white/5 flex items-center justify-center hover:bg-[#ffd900]/20 transition-colors">
                <span className="material-symbols-outlined text-white text-sm">share</span>
              </button>
              <button className="size-8 rounded bg-white/5 flex items-center justify-center hover:bg-[#ffd900]/20 transition-colors">
                <span className="material-symbols-outlined text-white text-sm">content_copy</span>
              </button>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#ffd900]">
            #PANCORAZONEWS
          </p>
        </div>
      </article>

      {/* 4. MÁS NOTICIAS (RECOMENDADOS) */}
      {/* Podríamos cargar las 3 últimas noticias aquí, pero por ahora lo dejamos limpio */}

      {/* Modal de Edición */}
      <AddNewsModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          if (id) loadNoticia(id);
        }}
        initialData={noticia}
      />
    </div>
  );
};

export default NoticiaDetalle;
