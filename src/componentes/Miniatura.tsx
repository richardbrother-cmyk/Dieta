import { useEffect, useState } from 'react';

interface Props {
  blob: Blob | null;
  className?: string;
  alt?: string;
}

/** Muestra un Blob como imagen y libera su URL al desmontar. */
export default function Miniatura({ blob, className = 'mini', alt = '' }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const nueva = URL.createObjectURL(blob);
    setUrl(nueva);
    return () => URL.revokeObjectURL(nueva);
  }, [blob]);

  if (!url) return blob ? <span className={className} /> : null;
  return <img className={className} src={url} alt={alt} />;
}
