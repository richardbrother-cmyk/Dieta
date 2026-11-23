import { AJUSTES_INICIALES, configuracionCompleta, guardarAjustes, leerAjustes } from './ajustes';
import type { Perfil } from '../dominio/tipos';

const perfil: Perfil = { sexo: 'hombre', edad: 30, estaturaCm: 175, pesoKg: 80, actividad: 'moderado' };

beforeEach(() => localStorage.clear());

test('sin nada guardado devuelve los iniciales', () =>
  expect(leerAjustes()).toEqual(AJUSTES_INICIALES));

test('JSON roto devuelve los iniciales', () => {
  localStorage.setItem('dieta.ajustes', '{roto');
  expect(leerAjustes()).toEqual(AJUSTES_INICIALES);
});

test('con meta automática recalcula desde el perfil', () => {
  guardarAjustes({ ...AJUSTES_INICIALES, perfil, metaKcal: 1, metaProteina: 1 });
  expect(leerAjustes()).toMatchObject({ metaKcal: 2150, metaProteina: 145 });
});

test('con meta manual conserva los valores dados', () => {
  guardarAjustes({ ...AJUSTES_INICIALES, perfil, metaManual: true, metaKcal: 1800, metaProteina: 130 });
  expect(leerAjustes()).toMatchObject({ metaKcal: 1800, metaProteina: 130 });
});

test('configuracionCompleta exige perfil y clave', () => {
  expect(configuracionCompleta(AJUSTES_INICIALES)).toBe(false);
  expect(configuracionCompleta({ ...AJUSTES_INICIALES, perfil })).toBe(false);
  expect(configuracionCompleta({ ...AJUSTES_INICIALES, perfil, apiKey: ' ' })).toBe(false);
  expect(configuracionCompleta({ ...AJUSTES_INICIALES, perfil, apiKey: 'sk-ant-x' })).toBe(true);
});
