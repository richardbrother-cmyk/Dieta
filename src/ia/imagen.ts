import { ErrorAnalisis } from './errores';

/** Lado mayor de la foto que se envía a Claude; más grande no mejora el resultado. */
export const LADO_MAXIMO = 1568;
export const LADO_MINIATURA = 400;

export function dimensionesReducidas(
  ancho: number,
  alto: number,
  max: number,
): { ancho: number; alto: number } {
  const f = Math.min(1, max / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * f), alto: Math.round(alto * f) };
}

function aJpeg(imagen: ImageBitmap, lado: number, calidad: number): Promise<Blob> {
  const { ancho, alto } = dimensionesReducidas(imagen.width, imagen.height, lado);
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new ErrorAnalisis('imagen_ilegible');
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob(
      (b) => (b ? resolver(b) : rechazar(new ErrorAnalisis('imagen_ilegible'))),
      'image/jpeg',
      calidad,
    ),
  );
}

async function aBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binario);
}

/** Reduce la foto para enviarla y genera la miniatura que se guarda. La original se descarta. */
export async function prepararFoto(archivo: Blob): Promise<{ base64: string; miniatura: Blob }> {
  let imagen: ImageBitmap;
  try {
    imagen = await createImageBitmap(archivo);
  } catch {
    throw new ErrorAnalisis('imagen_ilegible');
  }
  try {
    const [envio, miniatura] = await Promise.all([
      aJpeg(imagen, LADO_MAXIMO, 0.85),
      aJpeg(imagen, LADO_MINIATURA, 0.7),
    ]);
    return { base64: await aBase64(envio), miniatura };
  } catch {
    throw new ErrorAnalisis('imagen_ilegible');
  } finally {
    imagen.close?.();
  }
}
