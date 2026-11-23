import { bajoElPiso, calcularMetas, metabolismoBasal } from './metas';
import type { Perfil } from './tipos';

const h: Perfil = { sexo: 'hombre', edad: 30, estaturaCm: 175, pesoKg: 80, actividad: 'moderado' };

test('basal Mifflin hombre', () => expect(metabolismoBasal(h)).toBeCloseTo(1748.75));
test('basal Mifflin mujer', () =>
  expect(metabolismoBasal({ ...h, sexo: 'mujer' })).toBeCloseTo(1582.75));
test('meta: gasto × 0.80 redondeado a 50', () => expect(calcularMetas(h).metaKcal).toBe(2150));
test('proteína 1.8 g/kg redondeada a 5', () => expect(calcularMetas(h).metaProteina).toBe(145));
test('piso mujer 1200', () =>
  expect(
    calcularMetas({ sexo: 'mujer', edad: 60, estaturaCm: 150, pesoKg: 45, actividad: 'sedentario' }).metaKcal,
  ).toBe(1200));
test('piso hombre 1500', () =>
  expect(
    calcularMetas({ sexo: 'hombre', edad: 70, estaturaCm: 160, pesoKg: 50, actividad: 'sedentario' }).metaKcal,
  ).toBe(1500));
test('bajoElPiso', () => {
  expect(bajoElPiso(1400, 'hombre')).toBe(true);
  expect(bajoElPiso(1200, 'mujer')).toBe(false);
});
