import { fechaLocal } from '../dominio/fechas';
import type { Comida, Dia, Peso } from '../dominio/tipos';
import { avisarCambioDeAjustes, leerAjustes } from './ajustes';
import { db } from './db';

/** Crea la comida, o la reemplaza si trae `id`. Devuelve el id. */
export async function guardarComida(c: Omit<Comida, 'id'> & { id?: string }): Promise<string> {
  const id = c.id ?? crypto.randomUUID();
  const { metaKcal, metaProteina } = leerAjustes();
  await db.transaction('rw', db.comidas, db.dias, async () => {
    await db.comidas.put({ ...c, id });
    // La meta del día queda fijada con la primera comida de esa fecha.
    if (!(await db.dias.get(c.fecha))) {
      await db.dias.put({ fecha: c.fecha, metaKcal, metaProteina });
    }
  });
  return id;
}

export function borrarComida(id: string): Promise<void> {
  return db.comidas.delete(id);
}

export function comidaPorId(id: string): Promise<Comida | undefined> {
  return db.comidas.get(id);
}

export async function comidasDe(fecha: string): Promise<Comida[]> {
  const cs = await db.comidas.where('fecha').equals(fecha).toArray();
  return cs.sort((a, b) => a.hora.localeCompare(b.hora));
}

export function diaDe(fecha: string): Promise<Dia | undefined> {
  return db.dias.get(fecha);
}

export async function actualizarMetaDeHoy(metaKcal: number, metaProteina: number): Promise<void> {
  await db.dias.update(fechaLocal(), { metaKcal, metaProteina });
}

export async function comidasPorFecha(): Promise<Map<string, Comida[]>> {
  const mapa = new Map<string, Comida[]>();
  for (const c of await db.comidas.orderBy('fecha').toArray()) {
    const lista = mapa.get(c.fecha);
    if (lista) lista.push(c);
    else mapa.set(c.fecha, [c]);
  }
  for (const lista of mapa.values()) lista.sort((a, b) => a.hora.localeCompare(b.hora));
  return mapa;
}

export async function fechasConComidas(): Promise<string[]> {
  const fechas = await db.comidas.orderBy('fecha').uniqueKeys();
  return (fechas as string[]).reverse();
}

export async function guardarPeso(fecha: string, kg: number): Promise<void> {
  await db.pesos.put({ fecha, kg });
}

export function pesos(): Promise<Peso[]> {
  return db.pesos.orderBy('fecha').toArray();
}

export async function borrarTodo(): Promise<void> {
  await db.transaction('rw', db.comidas, db.dias, db.pesos, async () => {
    await Promise.all([db.comidas.clear(), db.dias.clear(), db.pesos.clear()]);
  });
  localStorage.removeItem('dieta.ajustes');
  localStorage.removeItem('dieta.ultimoRespaldo');
  avisarCambioDeAjustes();
}
