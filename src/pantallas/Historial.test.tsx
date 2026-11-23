import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { guardarAjustes, leerAjustes } from '../datos/ajustes';
import { guardarComida } from '../datos/repositorio';
import { etiquetaFecha, fechaLocal, sumarDias } from '../dominio/fechas';
import { abrir, arroz, comida, prepararApp } from '../pruebas/util';

const hoy = fechaLocal();
const hace = (n: number) => sumarDias(hoy, -n);
const con = (fecha: string, kcal: number, proteina_g = 0) =>
  guardarComida(comida(fecha, [{ ...arroz, kcal, proteina_g }]));
const filaDe = (fecha: string) => screen.getByRole('link', { name: new RegExp(etiquetaFecha(fecha)) });

beforeEach(() => prepararApp(1900, 140));

test('lista los días del más reciente al más antiguo con sus totales', async () => {
  await con(hace(3), 1000, 50);
  await con(hace(1), 1800, 150);
  await con(hace(2), 2100, 90);
  abrir('/historial');
  await screen.findByText(new RegExp(etiquetaFecha(hace(1))));
  const filas = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/historial/'));
  expect(filas.map((a) => a.getAttribute('href'))).toEqual(
    [hace(1), hace(2), hace(3)].map((f) => `/historial/${f}`),
  );
  expect(within(filaDe(hace(1))).getByText('1.800 kcal')).toBeInTheDocument();
});

test('cada día se juzga con la meta que tenía ese día', async () => {
  await con(hace(1), 1800);
  guardarAjustes({ ...leerAjustes(), metaKcal: 1500 });
  abrir('/historial');
  await screen.findByText(new RegExp(etiquetaFecha(hace(1))));
  expect(within(filaDe(hace(1))).getByText('Cumplió')).toBeInTheDocument();
});

test('un día por encima de su meta se marca como pasado', async () => {
  await con(hace(2), 2100);
  abrir('/historial');
  await screen.findByText(new RegExp(etiquetaFecha(hace(2))));
  expect(within(filaDe(hace(2))).getByText('Se pasó')).toBeInTheDocument();
});

test('la proteína se marca aparte y no afecta a Cumplió', async () => {
  await con(hace(1), 1800, 150);
  await con(hace(2), 1700, 90);
  abrir('/historial');
  await screen.findByText(new RegExp(etiquetaFecha(hace(1))));
  expect(within(filaDe(hace(1))).getByText('Proteína 150 g ✓')).toBeInTheDocument();
  expect(within(filaDe(hace(2))).getByText('Proteína 90 / 140 g')).toBeInTheDocument();
  expect(within(filaDe(hace(2))).getByText('Cumplió')).toBeInTheDocument();
});

test('el promedio de 7 días no incluye hoy', async () => {
  await con(hoy, 500);
  await con(hace(1), 2000);
  await con(hace(2), 1000);
  abrir('/historial');
  expect(await screen.findByText('1.500 kcal por día')).toBeInTheDocument();
});

test('sin días anteriores no hay promedio', async () => {
  await con(hoy, 500);
  abrir('/historial');
  expect(await screen.findByText('Aún no hay datos')).toBeInTheDocument();
});

test('sin registros lo dice', async () => {
  abrir('/historial');
  expect(await screen.findByText('Todavía no has registrado comidas')).toBeInTheDocument();
});

test('el detalle de un día lista sus comidas y deja agregar otra en esa fecha', async () => {
  const u = userEvent.setup();
  await con(hace(3), 1000);
  abrir(`/historial/${hace(3)}`);
  expect(await screen.findByRole('heading', { name: etiquetaFecha(hace(3)) })).toBeInTheDocument();
  expect(await screen.findByText('1.000 / 1.900 kcal')).toBeInTheDocument();
  expect(await screen.findByText('Almuerzo')).toBeInTheDocument();
  await u.click(screen.getByRole('button', { name: 'Agregar comida' }));
  expect(await screen.findByRole('heading', { name: 'Nueva comida' })).toBeInTheDocument();
  expect(screen.getByText(etiquetaFecha(hace(3)))).toBeInTheDocument();
});
