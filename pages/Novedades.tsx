import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Noticia } from '../types';
import { formatLocalDate } from '../utils/formatters';

const Novedades: React.FC = () => {
  const [headlines, setHeadlines] = useState<Noticia[]>([]);
  const [news, setNews] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const headlineData = await apiService.getNoticias(4, 0, true);
      setHeadlines(headlineData);

      const newsData = await apiService.getNoticias(ITEMS_PER_PAGE, 0);
      setNews(newsData);
      setOffset(ITEMS_PER_PAGE);
      if (newsData.length < ITEMS_PER_PAGE) setHasMore(false);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextNews = await apiService.getNoticias(ITEMS_PER_PAGE, offset);
      if (nextNews.length < ITEMS_PER_PAGE) setHasMore(false);
      setNews(prev => [...prev, ...nextNews]);
      setOffset(prev => prev + ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading more news:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (headlines.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % headlines.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [headlines]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd900]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-20 bg-[#0a0f1a]">
      {/* 1. HERO SLIDER (TITULARES) */}
      {headlines.length > 0 && (
        <section className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden">
          {headlines.map((item, index) => (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${apiService.resolveImageUrl(item.foto)})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-[#0a0f1a]/40 to-transparent"></div>
              </div>
              
              <div className="absolute inset-0 flex items-end px-4 md:px-10 pb-20">
                <div className="max-w-4xl">
                  <span className="inline-block px-3 py-1 bg-[#ffd900] text-black text-[10px] font-black uppercase tracking-widest mb-4">
                    {item.categoria}
                  </span>
                  <h2 className="text-4xl md:text-7xl font-black uppercase italic leading-[0.9] tracking-tighter text-white mb-4">
                    {item.titular}
                  </h2>
                  <p className="text-sm md:text-lg text-white/70 max-w-2xl font-medium leading-relaxed mb-8 line-clamp-2">
                    {item.bajada}
                  </p>
                  <Link
                    to={`/novedades/${item.id}`}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-white/10 hover:bg-[#ffd900] hover:text-black border border-white/20 hover:border-[#ffd900] text-white transition-all rounded-sm font-black text-xs uppercase tracking-widest"
                  >
                    LEER MÁS <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {/* Slider Indicators */}
          <div className="absolute bottom-10 right-10 z-20 flex gap-2">
            {headlines.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-12 h-1 transition-all ${index === currentSlide ? 'bg-[#ffd900]' : 'bg-white/20'}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2. GRID DE NOTICIAS */}
      <section className="px-4 md:px-10 max-w-7xl mx-auto w-full mt-20">
        <div className="flex flex-col gap-2 mb-12">
          <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">ÚLTIMAS NOTICIAS</h2>
          <div className="w-20 h-1.5 bg-[#ffd900]"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {news.map((item) => (
            <Link
              key={item.id}
              to={`/novedades/${item.id}`}
              className="group flex flex-col bg-[#121926]/40 border border-white/5 rounded-sm overflow-hidden hover:border-[#ffd900]/30 transition-all"
            >
              <div className="aspect-video overflow-hidden">
                <img
                  src={apiService.resolveImageUrl(item.foto)}
                  alt={item.titular}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="p-6 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#ffd900] text-[9px] font-black uppercase tracking-widest">
                    {item.categoria}
                  </span>
                  <span className="text-white/30 text-[9px] font-bold uppercase">
                    {formatLocalDate(item.fecha)}
                  </span>
                </div>
                <h3 className="text-xl font-black uppercase italic leading-tight text-white group-hover:text-[#ffd900] transition-colors line-clamp-2">
                  {item.titular}
                </h3>
                <p className="text-white/40 text-[11px] leading-relaxed line-clamp-3">
                  {item.bajada}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {hasMore && (
          <div className="flex justify-center mt-16">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-12 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 disabled:opacity-50"
            >
              {loadingMore ? 'CARGANDO...' : 'CARGAR MÁS NOTICIAS'}
              {!loadingMore && <span className="material-symbols-outlined text-lg">expand_more</span>}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Novedades;
