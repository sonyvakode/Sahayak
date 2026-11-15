import { useState } from 'react';
import { Package } from 'lucide-react';

export function ImageWithFallback({
  src,
  alt,
  className = '',
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#E9E3F5]/60 text-[#075B62] p-4 text-center ${className}`}
      >
        <Package className="w-8 h-8 mb-1.5 opacity-80" />
        <span className="text-xs font-medium text-[#124D52]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
