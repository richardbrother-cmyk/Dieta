import { z } from 'zod';
import { diasEntre, fechaLocal } from '../dominio/fechas';
import type { Ajustes, Comida, Dia, Peso } from '../dominio/tipos';
import { guardarAjustes, leerAjustes } from './ajustes';
import { db } from './db';

const CLAVE_RESPALDO = 'dieta.ultimoRespaldo';

type ComidaExportada = Omit<Comida, 'miniatura'> & { miniatura: string | null };

export interface Respaldo {
  version: 1;
  exportado: string;
  comidas: ComidaExportada[];
  dias: Dia[];
  pesos: Peso[];
  ajustes: Omit<Ajustes, 'apiKey'>;
}

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const numero = z.number().finite().nonnegative();

const esquema = z.object({
  version: z.literal(1),
  exportado: z.string(),
  comidas: z.array(
    z.object({
      id: z.string().min(1),
      fecha,
      hora: z.string().regex(/^\d{2}:\d{2}$/),
      tipo: z.enum(['desayuno', 'almuerzo', 'cena', 'merienda']),
      miniatura: z.string().startsWith('data:').nullable(),
      nota: z.string(),
      alimentos: z.array(
        z.object({
          nombre: z.string(),
          gramos: numero,
          kcal: numero,
          proteina_g: numero,
          carbos_g: numero,
          grasa_g: numero,
        }),
      ),
    }),
  ),
  dias: z.array(z.object({ fecha, metaKcal: numero, metaProteina: numero })),
  pesos: z.array(z.object({ fecha, kg: z.number().positive() })),
  ajustes: z.object({
    perfil: z
      .object({
        sexo: z.enum(['hombre', 'mujer']),
        edad: z.number().positive(),
        estaturaCm: z.number().positive(),
        pesoKg: z.number().positive(),
        actividad: z.enum(['sedentario', 'ligero', 'moderado', 'alto']),
      })
      .nullable(),
    metaKcal: numero,
    metaProteina: numero,
    metaManual: z.boolean(),
  }),
});

async function aDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binario = '';
  // Por tramos: String.fromCharCode con un arreglo grande desborda la pila.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binario)}`;
}

function aBlob(dataUrl: string): Blob {
  const [cabecera, datos] = dataUrl.split(',');
  const tipo = /^data:([^;]*)/.exec(cabecera)?.[1] || 'image/jpeg';
  const binario = atob(datos ?? '');
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

export async function exportar(): Promise<Respaldo> {
  const [comidas, dias, pesos] = await Promise.all([
    db.comidas.toArray(),
    db.dias.toArray(),
    db.pesos.toArray(),
  ]);
  // La clave de API nunca sale del teléfono.
  const { apiKey: _omitida, ...ajustes } = leerAjustes();
  return {
    version: 1,
    exportado: new Date().toISOString(),
    comidas: await Promise.all(
      comidas.map(async (c) => ({ ...c, miniatura: c.miniatura ? await aDataUrl(c.miniatura) : null })),
    ),
    dias,
    pesos,
    ajustes,
  };
}

/** Reemplaza todos los datos. Si el archivo no es válido, lanza y no cambia nada. */
export async function importar(json: unknown): Promise<void> {
  const leido = esquema.safeParse(json);
  if (!leido.success) throw new Error('Archivo no válido');
  let comidas: Comida[];
  try {
    comidas = leido.data.comidas.map((c) => ({
      ...c,
      miniatura: c.miniatura ? aBlob(c.miniatura) : null,
    }));
  } catch {
    throw new Error('Archivo no válido');
  }
  await db.transaction('rw', db.comidas, db.dias, db.pesos, async () => {
    await Promise.all([db.comidas.clear(), db.dias.clear(), db.pesos.clear()]);
    await db.comidas.bulkPut(comidas);
    await db.dias.bulkPut(leido.data.dias);
    await db.pesos.bulkPut(leido.data.pesos);
  });
  guardarAjustes({ ...leido.data.ajustes, apiKey: leerAjustes().apiKey });
}

/** Entrega el respaldo por la hoja de compartir del sistema o, si no la hay, lo descarga. */
export async function compartirRespaldo(): Promise<void> {
  const hoy = fechaLocal();
  const archivo = new File([JSON.stringify(await exportar())], `dieta-respaldo-${hoy}.json`, {
    type: 'application/json',
  });
  if (navigator.canShare?.({ files: [archivo] })) {
    // Si el usuario cancela, share() rechaza y el respaldo no se da por hecho.
    await navigator.share({ files: [archivo], title: 'Respaldo de Dieta' });
  } else {
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = archivo.name;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  localStorage.setItem(CLAVE_RESPALDO, hoy);
}

/**
 * Días que llevan sin respaldar los datos más antiguos pendientes,
 * o null si no hay nada registrado después del último respaldo.
 */
export async function diasSinRespaldo(hoy: string): Promise<number | null> {
  const ultimo = localStorage.getItem(CLAVE_RESPALDO);
  const [comida, peso] = await Promise.all([
    ultimo ? db.comidas.where('fecha').above(ultimo).first() : db.comidas.orderBy('fecha').first(),
    ultimo ? db.pesos.where('fecha').above(ultimo).first() : db.pesos.orderBy('fecha').first(),
  ]);
  const pendientes = [comida?.fecha, peso?.fecha].filter((f): f is string => !!f).sort();
  if (pendientes.length === 0) return null;
  return Math.max(0, diasEntre(ultimo ?? pendientes[0], hoy));
}

export async function pedirPersistencia(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Sin soporte: no hay nada que hacer.
  }
}
