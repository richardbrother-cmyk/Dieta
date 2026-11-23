import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { guardarAjustes, leerAjustes } from '../datos/ajustes';
import { borrarTodo, guardarPeso, pesos } from '../datos/repositorio';
import { ErrorAnalisis, MENSAJES } from '../ia/errores';

const { probarClave } = vi.hoisted(() => ({ probarClave: vi.fn() }));
vi.mock('../ia/analizar', async (original) => ({
  ...(await original<typeof import('../ia/analizar')>()),
  probarClave,
}));

const abrir = (ruta = '/') =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );

async function llenarPerfil(u: ReturnType<typeof userEvent.setup>) {
  await u.selectOptions(screen.getByLabelText('Sexo'), 'hombre');
  await u.type(screen.getByLabelText('Edad'), '30');
  await u.type(screen.getByLabelText('Estatura (cm)'), '175');
  await u.type(screen.getByLabelText('Peso (kg)'), '80');
  await u.selectOptions(screen.getByLabelText('Actividad'), 'moderado');
}

beforeEach(async () => {
  await borrarTodo();
  probarClave.mockReset();
  vi.restoreAllMocks();
});

test('sin configuración, la app abre en Ajustes con la invitación a completar', async () => {
  abrir('/');
  expect(await screen.findByRole('heading', { name: 'Ajustes' })).toBeInTheDocument();
  expect(screen.getByText('Completa tu perfil y tu clave para empezar')).toBeInTheDocument();
});

test('llenar el perfil muestra las metas calculadas y las guarda', async () => {
  const u = userEvent.setup();
  abrir('/ajustes');
  await llenarPerfil(u);
  expect(await screen.findByText('2.150 kcal')).toBeInTheDocument();
  expect(screen.getByText('145 g')).toBeInTheDocument();
  expect(leerAjustes()).toMatchObject({ metaKcal: 2150, metaProteina: 145 });
});

test('una meta manual por debajo del mínimo muestra advertencia', async () => {
  const u = userEvent.setup();
  abrir('/ajustes');
  await llenarPerfil(u);
  await u.click(screen.getByLabelText('Fijar meta a mano'));
  const kcal = screen.getByLabelText('Calorías por día');
  await u.clear(kcal);
  await u.type(kcal, '1300');
  expect(await screen.findByText(/Por debajo del mínimo recomendado/)).toBeInTheDocument();
  expect(leerAjustes()).toMatchObject({ metaManual: true, metaKcal: 1300 });
});

test('el campo de la clave oculta lo escrito', () => {
  abrir('/ajustes');
  expect(screen.getByLabelText('Clave de API')).toHaveAttribute('type', 'password');
});

test('probar clave: válida', async () => {
  const u = userEvent.setup();
  probarClave.mockResolvedValue(undefined);
  abrir('/ajustes');
  await u.type(screen.getByLabelText('Clave de API'), 'sk-ant-x');
  await u.click(screen.getByRole('button', { name: 'Probar clave' }));
  expect(await screen.findByText('Clave válida')).toBeInTheDocument();
  expect(probarClave).toHaveBeenCalledWith('sk-ant-x');
});

test('probar clave: inválida', async () => {
  const u = userEvent.setup();
  probarClave.mockRejectedValue(new ErrorAnalisis('clave_invalida'));
  abrir('/ajustes');
  await u.type(screen.getByLabelText('Clave de API'), 'mala');
  await u.click(screen.getByRole('button', { name: 'Probar clave' }));
  expect(await screen.findByText(MENSAJES.clave_invalida)).toBeInTheDocument();
});

test('borrar todo pide confirmación y no borra si se cancela', async () => {
  const u = userEvent.setup();
  await guardarPeso('2026-11-20', 80);
  const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
  abrir('/ajustes');
  await u.click(screen.getByRole('button', { name: 'Borrar todos los datos' }));
  expect(confirmar).toHaveBeenCalled();
  expect(await pesos()).toHaveLength(1);
});

test('borrar todo borra al confirmar', async () => {
  const u = userEvent.setup();
  await guardarPeso('2026-11-20', 80);
  guardarAjustes({ ...leerAjustes(), apiKey: 'sk-ant-x' });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  abrir('/ajustes');
  await u.click(screen.getByRole('button', { name: 'Borrar todos los datos' }));
  await vi.waitFor(async () => expect(await pesos()).toHaveLength(0));
  expect(leerAjustes().apiKey).toBe('');
});

test('importar un archivo inválido lo dice y no borra', async () => {
  const u = userEvent.setup();
  await guardarPeso('2026-11-20', 80);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  abrir('/ajustes');
  await u.upload(
    screen.getByLabelText('Importar respaldo'),
    new File(['{"foo":1}'], 'x.json', { type: 'application/json' }),
  );
  expect(await screen.findByText('Archivo no válido')).toBeInTheDocument();
  expect(await pesos()).toHaveLength(1);
});

test('aclara que los valores son orientativos', () => {
  abrir('/ajustes');
  expect(
    screen.getByText('Valores orientativos; no reemplazan el consejo de un profesional de salud.'),
  ).toBeInTheDocument();
});

test('con la configuración completa, la app abre en Hoy', async () => {
  guardarAjustes({
    perfil: { sexo: 'hombre', edad: 30, estaturaCm: 175, pesoKg: 80, actividad: 'moderado' },
    metaKcal: 0, metaProteina: 0, metaManual: false, apiKey: 'sk-ant-x',
  });
  abrir('/');
  expect(screen.queryByRole('heading', { name: 'Ajustes' })).not.toBeInTheDocument();
});
