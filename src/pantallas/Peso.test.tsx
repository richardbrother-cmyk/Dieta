import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { leerAjustes, guardarAjustes } from '../datos/ajustes';
import { guardarPeso, pesos } from '../datos/repositorio';
import { fechaLocal, sumarDias } from '../dominio/fechas';
import { abrir, prepararApp } from '../pruebas/util';

const hoy = fechaLocal();

async function anotar(u: ReturnType<typeof userEvent.setup>, valor: string) {
  const campo = await screen.findByLabelText('Peso de hoy (kg)');
  await u.clear(campo);
  if (valor) await u.type(campo, valor);
  await u.click(screen.getByRole('button', { name: 'Guardar peso' }));
}

beforeEach(() => prepararApp());

test('sin registros invita a anotar el primero', async () => {
  abrir('/peso');
  expect(await screen.findByText('Anota tu primer peso')).toBeInTheDocument();
});

test('guardar dos veces el mismo día deja un solo registro', async () => {
  const u = userEvent.setup();
  abrir('/peso');
  await anotar(u, '79,5');
  await vi.waitFor(async () => expect(await pesos()).toEqual([{ fecha: hoy, kg: 79.5 }]));
  await anotar(u, '79.2');
  await vi.waitFor(async () => expect(await pesos()).toEqual([{ fecha: hoy, kg: 79.2 }]));
});

test.each(['', '0', '401', 'abc'])('rechaza "%s"', async (valor) => {
  const u = userEvent.setup();
  abrir('/peso');
  await anotar(u, valor);
  expect(await screen.findByText('Peso no válido')).toBeInTheDocument();
  expect(await pesos()).toEqual([]);
});

test('muestra el cambio desde el inicio', async () => {
  await guardarPeso(sumarDias(hoy, -10), 82);
  await guardarPeso(sumarDias(hoy, -1), 80);
  abrir('/peso');
  expect(await screen.findByText('−2,0 kg desde el inicio')).toBeInTheDocument();
});

test('con un solo registro dibuja el punto sin fallar', async () => {
  await guardarPeso(hoy, 80);
  abrir('/peso');
  expect(await screen.findByRole('img', { name: 'Gráfica de peso' })).toBeInTheDocument();
  expect(document.querySelectorAll('.grafica circle')).toHaveLength(1);
});

test('la gráfica tiene la línea de registros y la de media', async () => {
  for (let i = 0; i < 4; i++) await guardarPeso(sumarDias(hoy, -i), 80 + i);
  abrir('/peso');
  await screen.findByRole('img', { name: 'Gráfica de peso' });
  expect(document.querySelectorAll('.grafica polyline')).toHaveLength(2);
  expect(document.querySelector('.grafica polyline.media')).not.toBeNull();
});

test('ofrece actualizar el perfil y lo hace al aceptar', async () => {
  const u = userEvent.setup();
  guardarAjustes({ ...leerAjustes(), metaManual: false });
  abrir('/peso');
  await anotar(u, '70');
  await u.click(await screen.findByRole('button', { name: 'Actualizar mi perfil a 70,0 kg' }));
  expect(leerAjustes().perfil!.pesoKg).toBe(70);
  expect(leerAjustes().metaProteina).toBe(125);
  expect(screen.queryByRole('button', { name: /Actualizar mi perfil/ })).not.toBeInTheDocument();
});

test('no cambia el perfil si no se acepta', async () => {
  const u = userEvent.setup();
  abrir('/peso');
  await anotar(u, '70');
  await screen.findByRole('button', { name: 'Actualizar mi perfil a 70,0 kg' });
  await u.click(screen.getByRole('button', { name: 'No, gracias' }));
  expect(leerAjustes().perfil!.pesoKg).toBe(80);
});

test('no ofrece actualizar si el peso coincide con el perfil', async () => {
  const u = userEvent.setup();
  abrir('/peso');
  await anotar(u, '80');
  await vi.waitFor(async () => expect(await pesos()).toHaveLength(1));
  expect(screen.queryByRole('button', { name: /Actualizar mi perfil/ })).not.toBeInTheDocument();
});
