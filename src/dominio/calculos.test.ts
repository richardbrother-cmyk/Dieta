import {
  cumplioMeta, escalarAlimento, limpiarEntero, limpiarNumero, mediaMovil7, promedio7, totalesDe, totalesDelDia,
} from './calculos';
import type { Alimento, Comida } from './tipos';

const arroz: Alimento = { nombre: 'Arroz', gramos: 180, kcal: 234, proteina_g: 4, carbos_g: 52, grasa_g: 0 };
const comida = (fecha: string, kcal: number): Comida => ({
  id: fecha + kcal, fecha, hora: '12:00', tipo: 'almuerzo', miniatura: null, nota: '',
  alimentos: [{ ...arroz, kcal }],
});

test('limpiarNumero', () => {
  expect(limpiarNumero('12,5')).toBe(12.5);
  expect(limpiarNumero('')).toBe(0);
  expect(limpiarNumero(NaN)).toBe(0);
  expect(limpiarNumero(-3)).toBe(0);
  expect(limpiarNumero(Infinity)).toBe(0);
  expect(limpiarNumero('abc')).toBe(0);
  expect(limpiarNumero(7)).toBe(7);
});
test('escalar a la mitad', () =>
  expect(escalarAlimento(arroz, 90)).toMatchObject({ gramos: 90, kcal: 117, carbos_g: 26 }));
test('escalar desde gramos 0 no produce NaN', () => {
  const r = escalarAlimento({ ...arroz, gramos: 0 }, 100);
  expect(Object.values(r).every((v) => typeof v !== 'number' || Number.isFinite(v))).toBe(true);
  expect(r.gramos).toBe(100);
  expect(r.kcal).toBe(234);
});
test('escalar con NaN o negativo → gramos 0 y todo 0', () => {
  expect(escalarAlimento(arroz, NaN).kcal).toBe(0);
  expect(escalarAlimento(arroz, -5).gramos).toBe(0);
});
test('totales suman e ignoran no finitos', () =>
  expect(totalesDe([arroz, { ...arroz, kcal: NaN }]).kcal).toBe(234));
test('totalesDelDia suma todas las comidas', () =>
  expect(totalesDelDia([comida('2026-11-23', 300), comida('2026-11-23', 200)]).kcal).toBe(500));
const dia = (metaKcal: number) => ({ fecha: '2026-11-23', metaKcal, metaProteina: 100 });
test('cumplió: con comidas y kcal ≤ meta', () =>
  expect(cumplioMeta([comida('2026-11-23', 234)], dia(2000))).toBe(true));
test('no cumplió: día sin comidas', () => expect(cumplioMeta([], dia(2000))).toBe(false));
test('no cumplió: kcal > meta', () =>
  expect(cumplioMeta([comida('2026-11-23', 234)], dia(200))).toBe(false));
test('promedio7 excluye hoy y días vacíos', () => {
  const m = new Map([
    ['2026-11-23', [comida('2026-11-23', 500)]],
    ['2026-11-22', [comida('2026-11-22', 2000)]],
    ['2026-11-21', [comida('2026-11-21', 1000)]],
    ['2026-11-20', []],
    ['2026-11-10', [comida('2026-11-10', 9000)]],
  ]);
  expect(promedio7(m, '2026-11-23')!.kcal).toBe(1500);
});
test('promedio7 sin días → null', () => expect(promedio7(new Map(), '2026-11-23')).toBeNull());
test('mediaMovil7 promedia hasta los 7 registros anteriores inclusive', () => {
  const r = mediaMovil7([
    { fecha: '2026-11-01', kg: 80 }, { fecha: '2026-11-02', kg: 79 }, { fecha: '2026-11-03', kg: 78 },
  ]);
  expect(r.map((x) => x.media)).toEqual([80, 79.5, 79]);
});
test('mediaMovil7 usa como máximo 7 registros', () => {
  const ps = Array.from({ length: 8 }, (_, i) => ({ fecha: `2026-11-0${i + 1}`, kg: i === 0 ? 100 : 70 }));
  expect(mediaMovil7(ps)[7].media).toBe(70);
});

test('limpiarEntero lee el punto y la coma como separadores de miles', () => {
  expect(limpiarEntero('1.800')).toBe(1800);
  expect(limpiarEntero('1,800')).toBe(1800);
  expect(limpiarEntero(' 2150 ')).toBe(2150);
  expect(limpiarEntero('')).toBe(0);
  expect(limpiarEntero('abc')).toBe(0);
});
