import Anthropic, { APIConnectionError, APIError } from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { limpiarNumero } from '../dominio/calculos';
import type { Alimento } from '../dominio/tipos';
import { ErrorAnalisis } from './errores';

export { ErrorAnalisis, MENSAJES, codigoDe, type CodigoError } from './errores';

const MODELO = 'claude-opus-5-5';

const EsquemaEstimacion = z.object({
  es_comida: z.boolean(),
  alimentos: z.array(
    z.object({
      nombre: z.string(),
      gramos: z.number(),
      kcal: z.number(),
      proteina_g: z.number(),
      carbos_g: z.number(),
      grasa_g: z.number(),
    }),
  ),
  nota: z.string(),
});

const INSTRUCCIONES = `Eres un nutricionista que estima el contenido de una comida para un registro personal de calorías.

Identifica cada alimento por separado y estima su porción en gramos. En una foto, usa el plato, los cubiertos y otros objetos como referencia de tamaño. Para cada alimento da las calorías y los gramos de proteína, carbohidratos y grasa de esa porción, ya cocinada y tal como se sirve.

Incluye lo que probablemente está aunque no se vea bien, como el aceite de cocción, las salsas o los aderezos, y menciónalo en "nota". Usa "nota" también para decir en una o dos frases qué supuestos hiciste o qué no pudiste distinguir; déjala vacía si no hay nada que aclarar.

Escribe los nombres en español, cortos y concretos ("Arroz blanco", "Pechuga de pollo a la plancha"). Las bebidas con calorías cuentan como alimentos.

Si no hay comida ni bebida que estimar, responde con es_comida en false y la lista de alimentos vacía.`;

export interface Estimacion {
  alimentos: Alimento[];
  nota: string;
}

function cliente(apiKey: string): Anthropic {
  if (!apiKey.trim()) throw new ErrorAnalisis('clave_invalida');
  // La app no tiene servidor: la clave es del propio usuario y vive solo en su teléfono.
  return new Anthropic({
    apiKey: apiKey.trim(),
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
    timeout: 90_000,
  });
}

function traducir(error: unknown): ErrorAnalisis {
  if (error instanceof ErrorAnalisis) return error;
  if (error instanceof APIConnectionError) return new ErrorAnalisis('sin_conexion');
  if (error instanceof APIError) {
    if (error.status === 401 || error.status === 403) return new ErrorAnalisis('clave_invalida');
    if (error.status === 429 || error.status === 402) return new ErrorAnalisis('limite');
    if (error.status === 400 && /credit balance/i.test(error.message)) {
      return new ErrorAnalisis('limite');
    }
  }
  return new ErrorAnalisis('sin_datos');
}

async function estimar(contenido: Anthropic.Beta.BetaContentBlockParam[], apiKey: string): Promise<Estimacion> {
  try {
    const respuesta = await cliente(apiKey).beta.messages.parse({
      model: MODELO,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: INSTRUCCIONES,
      messages: [{ role: 'user', content: contenido }],
      output_config: { effort: 'low', format: zodOutputFormat(EsquemaEstimacion) },
    });
    if (respuesta.stop_reason === 'refusal') throw new ErrorAnalisis('rechazo');
    const salida = respuesta.parsed_output;
    if (!salida) throw new ErrorAnalisis('sin_datos');
    if (!salida.es_comida) throw new ErrorAnalisis('no_es_comida');
    if (salida.alimentos.length === 0) throw new ErrorAnalisis('sin_datos');
    return {
      nota: salida.nota,
      alimentos: salida.alimentos.map((a) => ({
        nombre: a.nombre,
        gramos: limpiarNumero(a.gramos),
        kcal: limpiarNumero(a.kcal),
        proteina_g: limpiarNumero(a.proteina_g),
        carbos_g: limpiarNumero(a.carbos_g),
        grasa_g: limpiarNumero(a.grasa_g),
      })),
    };
  } catch (error) {
    throw traducir(error);
  }
}

export function analizarFoto(base64Jpeg: string, apiKey: string): Promise<Estimacion> {
  return estimar(
    [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Jpeg } },
      { type: 'text', text: 'Estima lo que hay en esta foto.' },
    ],
    apiKey,
  );
}

export function estimarTexto(descripcion: string, apiKey: string): Promise<Estimacion> {
  return estimar(
    [{ type: 'text', text: `Estima esta comida descrita por la persona que la comió:\n\n${descripcion}` }],
    apiKey,
  );
}

/** Hace una llamada mínima para comprobar que la clave funciona. */
export async function probarClave(apiKey: string): Promise<void> {
  try {
    await cliente(apiKey).messages.create({
      model: MODELO,
      max_tokens: 16,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: 'Responde solo: ok' }],
    });
  } catch (error) {
    throw traducir(error);
  }
}
