import React, { useState } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = "",
  wrapperClassName = "",
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative w-full h-full overflow-hidden ${wrapperClassName}`}>
      {/* Marcador de posición Shimmer */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 shimmer-placeholder z-10 rounded-sm" />
      )}

      {/* Marcador de posición para errores */}
      {hasError && (
        <div className="absolute inset-0 bg-[#101622] border border-white/10 flex flex-col items-center justify-center text-white/20 p-2 text-center rounded-sm z-10">
          <span className="material-symbols-outlined text-xl mb-1 text-red-400/40">image_not_supported</span>
          <span className="text-[7px] font-black uppercase tracking-wider text-white/20">Error de carga</span>
        </div>
      )}

      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;
