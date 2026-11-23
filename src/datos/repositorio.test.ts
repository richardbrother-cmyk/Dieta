import { fechaLocal } from '../dominio/fechas';
import type { Comida } from '../dominio/tipos';
import { guardarAjustes, leerAjustes } from './ajustes';
import {
  actualizarMetaDeHoy, borrarComida, borrarTodo, comidasDe, comidasPorFecha, diaDe,
  fechasConComidas, guardarComida, guardarPeso, pesos,
} from './repositorio';

const nueva = (fecha: string, hora = '12:00'): Omit<Comida, 'id'> => ({
  fecha, hora, tipo: 'almuerzo', miniatura: null, nota: '',
  alimentos: [{ nombre: 'Arroz', gramos: 180, kcal: 234, proteina_g: 4, carbos_g: 52, grasa_g: 0 }],
});
const conMeta = (metaKcal: number, metaProteina = 140) =>
  guardarAjustes({ ...leerAjustes(), metaManual: true, metaKcal, metaProteina });

beforeEach(async () => {
  await borrarTodo();
});

test('guardarComida crea el Dia con la meta actual', async () => {
  conMeta(1900);
  await guardarComida(nueva('2026-11-20'));
  expect(await diaDe('2026-11-20')).toEqual({ fecha: '2026-11-20', metaKcal: 1900, metaProteina: 140 });
});

test('una segunda comida el mismo día no cambia el Dia', async () => {
  conMeta(1900);
  await guardarComida(nueva('2026-11-20'));
  conMeta(1500);
  await guardarComida(nueva('2026-11-20', '20:00'));
  expect((await diaDe('2026-11-20'))!.metaKcal).toBe(1900);
});

test('cambiar la meta actualiza el Dia de hoy y no los pasados', async () => {
  conMeta(1900);
  const hoy = fechaLocal();
  await guardarComida(nueva('2026-01-01'));
  await guardarComida(nueva(hoy));
  conMeta(1700, 120);
  await actualizarMetaDeHoy(1700, 120);
  expect((await diaDe(hoy))!.metaKcal).toBe(1700);
  expect((await diaDe('2026-01-01'))!.metaKcal).toBe(1900);
});

test('guardarComida con id existente actualiza en vez de duplicar', async () => {
  const id = await guardarComida(nueva('2026-11-20'));
  await guardarComida({ ...nueva('2026-11-20'), id, nota: 'editada' });
  const cs = await comidasDe('2026-11-20');
  expect(cs).toHaveLength(1);
  expect(cs[0].nota).toBe('editada');
});

test('comidasDe ordena por hora; fechasConComidas va en orden descendente', async () => {
  await guardarComida(nueva('2026-11-20', '20:00'));
  await guardarComida(nueva('2026-11-20', '08:00'));
  await guardarComida(nueva('2026-11-22'));
  expect((await comidasDe('2026-11-20')).map((c) => c.hora)).toEqual(['08:00', '20:00']);
  expect(await fechasConComidas()).toEqual(['2026-11-22', '2026-11-20']);
  expect((await comidasPorFecha()).get('2026-11-20')).toHaveLength(2);
});

test('borrarComida la quita', async () => {
  const id = await guardarComida(nueva('2026-11-20'));
  await borrarComida(id);
  expect(await comidasDe('2026-11-20')).toEqual([]);
  expect(await fechasConComidas()).toEqual([]);
});

test('guardarPeso reemplaza el del mismo día', async () => {
  await guardarPeso('2026-11-20', 80);
  await guardarPeso('2026-11-20', 79.2);
  await guardarPeso('2026-11-19', 81);
  expect(await pesos()).toEqual([
    { fecha: '2026-11-19', kg: 81 },
    { fecha: '2026-11-20', kg: 79.2 },
  ]);
});
