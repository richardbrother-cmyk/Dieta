import { etiquetaFecha, fechaLocal, horaLocal, tipoPorHora } from './fechas';

test('23:30 local pertenece a ese día', () =>
  expect(fechaLocal(new Date(2026, 10, 23, 23, 30))).toBe('2026-11-23'));
test('00:10 local es el día siguiente', () =>
  expect(fechaLocal(new Date(2026, 10, 24, 0, 10))).toBe('2026-11-24'));
test('rellena con ceros', () => expect(fechaLocal(new Date(2026, 0, 5, 9))).toBe('2026-01-05'));
test('horaLocal HH:mm', () => expect(horaLocal(new Date(2026, 0, 5, 9, 7))).toBe('09:07'));
test.each([
  [8, 'desayuno'],
  [13, 'almuerzo'],
  [17, 'merienda'],
  [21, 'cena'],
])('tipoPorHora %i', (h, t) => expect(tipoPorHora(new Date(2026, 0, 1, h))).toBe(t));
test('etiquetaFecha en español', () => expect(etiquetaFecha('2026-11-23')).toBe('lun 23 nov'));
