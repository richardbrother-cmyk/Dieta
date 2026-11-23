import { sumarDias } from './fechas';
import type { Alimento, Comida, Dia, Peso, Totales } from './tipos';

/** Acepta lo que escribe el usuario o devuelve el modelo; lo no válido o negativo es 0. */
export function limpiarNumero(v: unknown): number {
  const n = typeof v === 'string' ? Number(v.trim().replace(',', '.')) : Number(v);
  if (v === '' || v === null || !Number.isFinite(n) || n < 0) return 0;
  return n;
}

const unDecimal = (n: number) => Math.round(n * 10) / 10;

/** Cambia los gramos y ajusta calorías y macros en la misma proporción. */
export function escalarAlimento(a: Alimento, gramosNuevos: number): Alimento {
  const gramos = limpiarNumero(gramosNuevos);
  // Sin gramos de partida no hay proporción que aplicar: se conservan los valores.
  if (a.gramos <= 0) return { ...a, gramos };
  const f = gramos / a.gramos;
  return {
    nombre: a.nombre,
    gramos,
    kcal: Math.round(limpiarNumero(a.kcal) * f),
    proteina_g: unDecimal(limpiarNumero(a.proteina_g) * f),
    carbos_g: unDecimal(limpiarNumero(a.carbos_g) * f),
    grasa_g: unDecimal(limpiarNumero(a.grasa_g) * f),
  };
}

export function totalesDe(alimentos: Alimento[]): Totales {
  const t: Totales = { kcal: 0, proteina_g: 0, carbos_g: 0, grasa_g: 0 };
  for (const a of alimentos) {
    t.kcal += limpiarNumero(a.kcal);
    t.proteina_g += limpiarNumero(a.proteina_g);
    t.carbos_g += limpiarNumero(a.carbos_g);
    t.grasa_g += limpiarNumero(a.grasa_g);
  }
  return t;
}

export function totalesDelDia(comidas: Comida[]): Totales {
  return totalesDe(comidas.flatMap((c) => c.alimentos));
}

/** Un día cumple si tiene al menos una comida y no supera su meta de calorías. */
export function cumplioMeta(comidas: Comida[], dia: Dia): boolean {
  return comidas.length > 0 && totalesDelDia(comidas).kcal <= dia.metaKcal;
}

/** Promedio de los 7 días anteriores a `hoy`, contando solo los que tienen comidas. */
export function promedio7(comidasPorFecha: Map<string, Comida[]>, hoy: string): Totales | null {
  const dias: Totales[] = [];
  for (let i = 1; i <= 7; i++) {
    const comidas = comidasPorFecha.get(sumarDias(hoy, -i));
    if (comidas && comidas.length > 0) dias.push(totalesDelDia(comidas));
  }
  if (dias.length === 0) return null;
  const media = (k: keyof Totales) => dias.reduce((s, d) => s + d[k], 0) / dias.length;
  return {
    kcal: media('kcal'),
    proteina_g: media('proteina_g'),
    carbos_g: media('carbos_g'),
    grasa_g: media('grasa_g'),
  };
}

/** Media de cada registro con los hasta 6 anteriores. Espera los pesos en orden ascendente. */
export function mediaMovil7(pesos: Peso[]): Array<{ fecha: string; kg: number; media: number }> {
  return pesos.map((p, i) => {
    const ventana = pesos.slice(Math.max(0, i - 6), i + 1);
    return { ...p, media: ventana.reduce((s, x) => s + x.kg, 0) / ventana.length };
  });
}
