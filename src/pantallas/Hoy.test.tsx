import { screen } from '@testing-library/react';
import { guardarComida } from '../datos/repositorio';
import { fechaLocal, sumarDias } from '../dominio/fechas';
import { abrir, arroz, comida, prepararApp } from '../pruebas/util';

const hoy = fechaLocal();
const con = (kcal: number, proteina_g = 0) => comida(hoy, [{ ...arroz, kcal, proteina_g }]);

beforeEach(() => prepararApp(1900, 140));

test('muestra lo consumido, la meta y lo que queda', async () => {
  await guardarComida(con(420, 30));
  await guardarComida(con(820, 55));
  abrir('/');
  expect(await screen.findByText('1.240 / 1.900 kcal')).toBeInTheDocument();
  expect(screen.getByText('quedan 660')).toBeInTheDocument();
  expect(screen.getByText('85 / 140 g')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).not.toHaveClass('excedido');
});

test('al pasarse dice cuánto sobra y cambia la barra', async () => {
  await guardarComida(con(2000));
  abrir('/');
  expect(await screen.findByText('sobran 100')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveClass('excedido');
});

test('solo cuenta las comidas de hoy', async () => {
  await guardarComida(comida(sumarDias(hoy, -1), [{ ...arroz, kcal: 999 }]));
  abrir('/');
  expect(await screen.findByText('0 / 1.900 kcal')).toBeInTheDocument();
  expect(await screen.findByText('Aún no hay comidas')).toBeInTheDocument();
});

test('ofrece cámara, galería y carga a mano', async () => {
  abrir('/');
  const camara = await screen.findByLabelText('Foto del plato');
  expect(camara).toHaveAttribute('capture', 'environment');
  expect(camara).toHaveAttribute('accept', 'image/*');
  expect(screen.getByLabelText('Elegir de la galería')).not.toHaveAttribute('capture');
  expect(screen.getByRole('button', { name: 'Agregar a mano' })).toBeInTheDocument();
});

test('avisa cuando pasan más de 7 días sin respaldo', async () => {
  await guardarComida(comida(sumarDias(hoy, -9), [arroz]));
  abrir('/');
  expect(await screen.findByText(/Llevas 9 días sin respaldo/)).toBeInTheDocument();
});

test('no avisa con 7 días o menos', async () => {
  await guardarComida(comida(sumarDias(hoy, -7), [arroz]));
  abrir('/');
  await screen.findByText('0 / 1.900 kcal');
  expect(screen.queryByText(/sin respaldo/)).not.toBeInTheDocument();
});
