import { dimensionesReducidas, prepararFoto } from './imagen';

test('reduce una foto horizontal grande', () =>
  expect(dimensionesReducidas(4000, 3000, 1568)).toEqual({ ancho: 1568, alto: 1176 }));
test('reduce una foto vertical grande', () =>
  expect(dimensionesReducidas(3000, 4000, 1568)).toEqual({ ancho: 1176, alto: 1568 }));
test('nunca amplía', () =>
  expect(dimensionesReducidas(800, 600, 1568)).toEqual({ ancho: 800, alto: 600 }));

test('un archivo que no es imagen se rechaza como ilegible', async () => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new DOMException('no decodifica')));
  await expect(prepararFoto(new Blob(['no soy imagen']))).rejects.toMatchObject({
    codigo: 'imagen_ilegible',
  });
  vi.unstubAllGlobals();
});
