export type CodigoError =
  | 'clave_invalida'
  | 'limite'
  | 'sin_conexion'
  | 'rechazo'
  | 'no_es_comida'
  | 'imagen_ilegible'
  | 'sin_datos';

export const MENSAJES: Record<CodigoError, string> = {
  clave_invalida: 'La clave de API no es válida o falta. Revísala en Ajustes.',
  limite: 'Tu cuenta de Anthropic llegó a su límite de uso o no tiene saldo.',
  sin_conexion: 'No hay conexión. Revisa tu internet e inténtalo de nuevo.',
  rechazo: 'No se pudo analizar este contenido.',
  no_es_comida: 'No encontré comida en la foto.',
  imagen_ilegible: 'No se pudo leer la imagen. Prueba con otra foto.',
  sin_datos: 'El análisis no devolvió resultados. Inténtalo de nuevo.',
};

export class ErrorAnalisis extends Error {
  constructor(public codigo: CodigoError) {
    super(MENSAJES[codigo]);
    this.name = 'ErrorAnalisis';
  }
}

export function codigoDe(error: unknown): CodigoError {
  return error instanceof ErrorAnalisis ? error.codigo : 'sin_datos';
}
