import { diasEntre, etiquetaFecha } from '../dominio/fechas';
import { decimal1 } from '../dominio/formato';

interface Punto {
  fecha: string;
  kg: number;
  media: number;
}

const ANCHO = 320;
const ALTO = 170;
const MARGEN = { arriba: 12, derecha: 12, abajo: 22, izquierda: 38 };

/** Registros de peso (línea fina) y su media móvil (línea gruesa). */
export default function GraficaPeso({ puntos }: { puntos: Punto[] }) {
  if (puntos.length === 0) return null;

  const valores = puntos.flatMap((p) => [p.kg, p.media]);
  const min = Math.min(...valores) - 0.5;
  const max = Math.max(...valores) + 0.5;
  const dias = Math.max(1, diasEntre(puntos[0].fecha, puntos[puntos.length - 1].fecha));
  const x = (fecha: string) =>
    puntos.length === 1
      ? (MARGEN.izquierda + ANCHO - MARGEN.derecha) / 2
      : MARGEN.izquierda +
        (diasEntre(puntos[0].fecha, fecha) / dias) * (ANCHO - MARGEN.izquierda - MARGEN.derecha);
  const y = (kg: number) =>
    MARGEN.arriba + ((max - kg) / (max - min)) * (ALTO - MARGEN.arriba - MARGEN.abajo);
  const linea = (campo: 'kg' | 'media') =>
    puntos.map((p) => `${x(p.fecha).toFixed(1)},${y(p[campo]).toFixed(1)}`).join(' ');

  return (
    <svg className="grafica" viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label="Gráfica de peso">
      <text x={MARGEN.izquierda - 6} y={y(max - 0.5) + 4} textAnchor="end">
        {decimal1(max - 0.5)}
      </text>
      <text x={MARGEN.izquierda - 6} y={y(min + 0.5) + 4} textAnchor="end">
        {decimal1(min + 0.5)}
      </text>
      <text x={MARGEN.izquierda} y={ALTO - 6}>
        {etiquetaFecha(puntos[0].fecha)}
      </text>
      {puntos.length > 1 && (
        <>
          <text x={ANCHO - MARGEN.derecha} y={ALTO - 6} textAnchor="end">
            {etiquetaFecha(puntos[puntos.length - 1].fecha)}
          </text>
          <polyline points={linea('kg')} />
          <polyline className="media" points={linea('media')} />
        </>
      )}
      {puntos.length === 1 && <circle cx={x(puntos[0].fecha)} cy={y(puntos[0].kg)} r={4} />}
    </svg>
  );
}
