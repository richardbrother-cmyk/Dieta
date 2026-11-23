import { decimal1, entero } from './formato';

test('entero agrupa miles con punto', () => {
  expect(entero(2150)).toBe('2.150');
  expect(entero(482.4)).toBe('482');
  expect(entero(NaN)).toBe('0');
});
test('decimal1 usa coma', () => {
  expect(decimal1(79.5)).toBe('79,5');
  expect(decimal1(80)).toBe('80,0');
});
