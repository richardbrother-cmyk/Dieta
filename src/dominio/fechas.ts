import type { TipoComida } from './tipos';

const dos = (n: number) => String(n).padStart(2, '0');

/** Fecha en la zona horaria del teléfono. No usar toISOString: eso da la fecha UTC. */
export function fechaLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export function horaLocal(d: Date = new Date()): string {
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function tipoPorHora(d: Date = new Date()): TipoComida {
  const h = d.getHours();
  if (h < 11) return 'desayuno';
  if (h < 16) return 'almuerzo';
  if (h < 19) return 'merienda';
  return 'cena';
}

/** Convierte 'YYYY-MM-DD' en una fecha local a mediodía, lejos de los cambios de hora. */
export function aFecha(fecha: string): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d, 12);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = aFecha(fecha);
  d.setDate(d.getDate() + dias);
  return fechaLocal(d);
}

/** Días calendario de `desde` a `hasta`; negativo si `hasta` es anterior. */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 86_400_000);
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function etiquetaFecha(fecha: string): string {
  const d = aFecha(fecha);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}
