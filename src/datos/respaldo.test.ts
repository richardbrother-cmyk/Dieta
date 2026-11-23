import { guardarAjustes, leerAjustes } from './ajustes';
import { borrarTodo, comidasDe, diaDe, guardarComida, guardarPeso, pesos } from './repositorio';
import { compartirRespaldo, diasSinRespaldo, exportar, importar } from './respaldo';
import type { Comida, Perfil } from '../dominio/tipos';

const perfil: Perfil = { sexo: 'hombre', edad: 30, estaturaCm: 175, pesoKg: 80, actividad: 'moderado' };
const CLAVE = 'sk-ant-secreta-123';
const nueva = (fecha: string, miniatura: Blob | null = null): Omit<Comida, 'id'> => ({
  fecha, hora: '12:00', tipo: 'almuerzo', miniatura, nota: 'n',
  alimentos: [{ nombre: 'Arroz', gramos: 180, kcal: 234, proteina_g: 4, carbos_g: 52, grasa_g: 0 }],
});

async function sembrar() {
  guardarAjustes({ perfil, metaKcal: 0, metaProteina: 0, metaManual: false, apiKey: CLAVE });
  await guardarComida(nueva('2026-11-20', new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'image/jpeg' })));
  await guardarComida(nueva('2026-11-21'));
  await guardarPeso('2026-11-20', 80);
  await guardarPeso('2026-11-21', 79.5);
}

beforeEach(async () => {
  await borrarTodo();
  vi.unstubAllGlobals();
});

test('ida y vuelta conserva comidas, días, pesos y miniaturas', async () => {
  await sembrar();
  const r = JSON.parse(JSON.stringify(await exportar()));
  await borrarTodo();
  await importar(r);
  const c20 = await comidasDe('2026-11-20');
  expect(c20).toHaveLength(1);
  expect(c20[0].alimentos[0].kcal).toBe(234);
  expect(c20[0].miniatura).toBeInstanceOf(Blob);
  expect(c20[0].miniatura!.size).toBe(5);
  expect(c20[0].miniatura!.type).toBe('image/jpeg');
  expect((await comidasDe('2026-11-21'))[0].miniatura).toBeNull();
  expect((await diaDe('2026-11-20'))!.metaKcal).toBe(2150);
  expect(await pesos()).toHaveLength(2);
  expect(leerAjustes().perfil).toEqual(perfil);
});

test('el respaldo no contiene la clave de API', async () => {
  await sembrar();
  const texto = JSON.stringify(await exportar());
  expect(texto).not.toContain(CLAVE);
  expect(texto).not.toContain('apiKey');
});

test('importar conserva la clave de API actual', async () => {
  await sembrar();
  const r = JSON.parse(JSON.stringify(await exportar()));
  guardarAjustes({ ...leerAjustes(), apiKey: 'sk-ant-otra' });
  await importar(r);
  expect(leerAjustes().apiKey).toBe('sk-ant-otra');
});

test.each([[{ foo: 1 }], ['texto'], [null], [{ version: 2, comidas: [], dias: [], pesos: [], ajustes: {} }]])(
  'importar rechaza %j sin tocar los datos',
  async (malo) => {
    await sembrar();
    await expect(importar(malo)).rejects.toThrow('Archivo no válido');
    expect(await comidasDe('2026-11-20')).toHaveLength(1);
    expect(await pesos()).toHaveLength(2);
  },
);

test('importar rechaza una comida con datos mal formados', async () => {
  await sembrar();
  const r = JSON.parse(JSON.stringify(await exportar()));
  r.comidas[0].alimentos = 'no soy lista';
  await expect(importar(r)).rejects.toThrow('Archivo no válido');
  expect(await comidasDe('2026-11-21')).toHaveLength(1);
});

test('diasSinRespaldo cuenta desde la primera comida si nunca hubo respaldo', async () => {
  await guardarComida(nueva('2026-11-20'));
  expect(await diasSinRespaldo('2026-11-29')).toBe(9);
});

test('diasSinRespaldo es null sin datos', async () => {
  expect(await diasSinRespaldo('2026-11-29')).toBeNull();
});

test('compartir usa la hoja de compartir y marca el respaldo', async () => {
  await guardarComida(nueva('2026-11-20'));
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share });
  await compartirRespaldo();
  expect(share).toHaveBeenCalledTimes(1);
  const archivo: File = share.mock.calls[0][0].files[0];
  expect(archivo.name).toMatch(/^dieta-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
  expect(await diasSinRespaldo('2026-11-29')).toBeNull();
});

test('tras un respaldo, datos nuevos vuelven a contar', async () => {
  await guardarComida(nueva('2026-11-20'));
  localStorage.setItem('dieta.ultimoRespaldo', '2026-11-21');
  expect(await diasSinRespaldo('2026-11-29')).toBeNull();
  await guardarComida(nueva('2026-11-25'));
  expect(await diasSinRespaldo('2026-11-29')).toBe(8);
});
