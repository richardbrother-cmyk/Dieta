import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as repositorio from '../datos/repositorio';
import { comidasDe, guardarComida } from '../datos/repositorio';
import { fechaLocal, tipoPorHora } from '../dominio/fechas';
import { ErrorAnalisis, MENSAJES } from '../ia/errores';
import { abrir, arroz, comida, pollo, prepararApp } from '../pruebas/util';

const { analizarFoto, estimarTexto, prepararFoto } = vi.hoisted(() => ({
  analizarFoto: vi.fn(),
  estimarTexto: vi.fn(),
  prepararFoto: vi.fn(),
}));
vi.mock('../ia/analizar', async (o) => ({
  ...(await o<typeof import('../ia/analizar')>()),
  analizarFoto,
  estimarTexto,
}));
vi.mock('../ia/imagen', async (o) => ({ ...(await o<typeof import('../ia/imagen')>()), prepararFoto }));

const hoy = fechaLocal();
const foto = new Blob(['foto'], { type: 'image/jpeg' });
const miniatura = new Blob(['mini'], { type: 'image/jpeg' });
const conFoto = () => abrir('/revision', { fecha: hoy, foto });
const fila = (nombre: string) => screen.getByRole('group', { name: nombre });
const campo = (nombre: string, etiqueta: string) =>
  within(fila(nombre)).getByLabelText(etiqueta) as HTMLInputElement;

beforeEach(async () => {
  await prepararApp();
  vi.restoreAllMocks();
  for (const m of [analizarFoto, estimarTexto, prepararFoto]) m.mockReset();
  prepararFoto.mockResolvedValue({ base64: 'QUJD', miniatura });
  analizarFoto.mockResolvedValue({ alimentos: [arroz, pollo], nota: 'Asumí aceite de cocción' });
});

test('analiza la foto y muestra la estimación con su nota', async () => {
  let soltar!: (v: unknown) => void;
  analizarFoto.mockReturnValue(new Promise((r) => (soltar = r)));
  conFoto();
  expect(await screen.findByText('Analizando…')).toBeInTheDocument();
  soltar({ alimentos: [arroz, pollo], nota: 'Asumí aceite de cocción' });
  expect(await screen.findByDisplayValue('Arroz blanco')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Pechuga de pollo')).toBeInTheDocument();
  expect(screen.getByText('Asumí aceite de cocción')).toBeInTheDocument();
  expect(screen.getByText('Estimación, corrige si hace falta')).toBeInTheDocument();
  expect(screen.getByText('Total 482 kcal')).toBeInTheDocument();
  expect(analizarFoto).toHaveBeenCalledWith('QUJD', 'sk-ant-prueba');
});

test('cambiar los gramos recalcula calorías y total', async () => {
  const u = userEvent.setup();
  conFoto();
  await screen.findByDisplayValue('Arroz blanco');
  const gramos = campo('Arroz blanco', 'Gramos');
  await u.clear(gramos);
  await u.type(gramos, '90');
  expect(campo('Arroz blanco', 'kcal')).toHaveValue('117');
  expect(screen.getByText('Total 365 kcal')).toBeInTheDocument();
});

test('borrar los gramos muestra 0 y nunca NaN', async () => {
  const u = userEvent.setup();
  conFoto();
  await screen.findByDisplayValue('Arroz blanco');
  await u.clear(campo('Arroz blanco', 'Gramos'));
  expect(campo('Arroz blanco', 'kcal')).toHaveValue('0');
  expect(document.body.textContent).not.toContain('NaN');
  expect(screen.getByText('Total 248 kcal')).toBeInTheDocument();
});

test('editar las calorías no cambia los gramos; renombrar no cambia números', async () => {
  const u = userEvent.setup();
  conFoto();
  await screen.findByDisplayValue('Arroz blanco');
  const kcal = campo('Arroz blanco', 'kcal');
  await u.clear(kcal);
  await u.type(kcal, '300');
  expect(campo('Arroz blanco', 'Gramos')).toHaveValue('180');
  const nombre = screen.getByDisplayValue('Arroz blanco');
  await u.clear(nombre);
  await u.type(nombre, 'Arroz frito');
  expect(campo('Arroz frito', 'kcal')).toHaveValue('300');
  expect(campo('Arroz frito', 'Gramos')).toHaveValue('180');
});

test('se puede quitar un alimento', async () => {
  const u = userEvent.setup();
  conFoto();
  await screen.findByDisplayValue('Arroz blanco');
  await u.click(within(fila('Arroz blanco')).getByRole('button', { name: 'Quitar Arroz blanco' }));
  expect(screen.queryByDisplayValue('Arroz blanco')).not.toBeInTheDocument();
  expect(screen.getByText('Total 248 kcal')).toBeInTheDocument();
});

test('el tipo de comida arranca según la hora', async () => {
  conFoto();
  await screen.findByDisplayValue('Arroz blanco');
  expect(screen.getByLabelText('Tipo de comida')).toHaveValue(tipoPorHora());
});

test('guardar crea la comida con su miniatura y vuelve a Hoy', async () => {
  const u = userEvent.setup();
  conFoto();
  await screen.findByDisplayValue('Arroz blanco');
  await u.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(await screen.findByText('482 / 1.900 kcal')).toBeInTheDocument();
  const guardadas = await comidasDe(hoy);
  expect(guardadas).toHaveLength(1);
  expect(guardadas[0].alimentos).toEqual([arroz, pollo]);
  expect(guardadas[0].miniatura!.size).toBe(4);
  expect(guardadas[0].nota).toBe('Asumí aceite de cocción');
});

test('dos toques rápidos en Guardar crean una sola comida', async () => {
  const u = userEvent.setup();
  conFoto();
  await screen.findByDisplayValue('Arroz blanco');
  const boton = screen.getByRole('button', { name: 'Guardar' });
  await Promise.all([u.click(boton), u.click(boton)]);
  await screen.findByText('482 / 1.900 kcal');
  expect(await comidasDe(hoy)).toHaveLength(1);
});

test('si guardar falla lo dice y conserva lo editado', async () => {
  const u = userEvent.setup();
  vi.spyOn(repositorio, 'guardarComida').mockRejectedValue(new Error('QuotaExceededError'));
  conFoto();
  await screen.findByDisplayValue('Arroz blanco');
  const gramos = campo('Arroz blanco', 'Gramos');
  await u.clear(gramos);
  await u.type(gramos, '90');
  await u.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(await screen.findByText(/No se pudo guardar/)).toBeInTheDocument();
  expect(campo('Arroz blanco', 'Gramos')).toHaveValue('90');
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
});

test('si la foto no tiene comida ofrece reintentar o cargar a mano', async () => {
  const u = userEvent.setup();
  analizarFoto.mockRejectedValueOnce(new ErrorAnalisis('no_es_comida'));
  conFoto();
  expect(await screen.findByText(MENSAJES.no_es_comida)).toBeInTheDocument();
  expect(await screen.findByRole('img', { name: 'Foto de la comida' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cargar a mano' })).toBeInTheDocument();
  await u.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByDisplayValue('Arroz blanco')).toBeInTheDocument();
  expect(prepararFoto).toHaveBeenCalledTimes(1);
});

test('con clave inválida enlaza a Ajustes', async () => {
  analizarFoto.mockRejectedValue(new ErrorAnalisis('clave_invalida'));
  conFoto();
  expect(await screen.findByText(MENSAJES.clave_invalida)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ir a Ajustes' })).toHaveAttribute('href', '/ajustes');
});

test('una imagen ilegible lo dice y deja cargar a mano', async () => {
  prepararFoto.mockRejectedValue(new ErrorAnalisis('imagen_ilegible'));
  conFoto();
  expect(await screen.findByText(MENSAJES.imagen_ilegible)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cargar a mano' })).toBeInTheDocument();
  expect(analizarFoto).not.toHaveBeenCalled();
});

test('agregar alimento por texto añade lo estimado a la lista', async () => {
  const u = userEvent.setup();
  estimarTexto.mockResolvedValue({
    alimentos: [{ nombre: 'Huevo', gramos: 100, kcal: 155, proteina_g: 13, carbos_g: 1, grasa_g: 11 }],
    nota: '',
  });
  conFoto();
  await screen.findByDisplayValue('Arroz blanco');
  await u.click(screen.getByRole('button', { name: 'Agregar alimento' }));
  await u.type(screen.getByLabelText('¿Qué comiste?'), '2 huevos');
  await u.click(screen.getByRole('button', { name: 'Estimar' }));
  expect(await screen.findByDisplayValue('Huevo')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Arroz blanco')).toBeInTheDocument();
  expect(screen.getByText('Total 637 kcal')).toBeInTheDocument();
  expect(estimarTexto).toHaveBeenCalledWith('2 huevos', 'sk-ant-prueba');
});

test('si la estimación por texto falla se pueden escribir los números', async () => {
  const u = userEvent.setup();
  estimarTexto.mockRejectedValue(new ErrorAnalisis('sin_conexion'));
  abrir('/revision', { fecha: hoy, texto: true });
  await u.type(await screen.findByLabelText('¿Qué comiste?'), 'pan');
  await u.click(screen.getByRole('button', { name: 'Estimar' }));
  expect(await screen.findByText(MENSAJES.sin_conexion)).toBeInTheDocument();
  await u.click(screen.getByRole('button', { name: 'Escribir los números a mano' }));
  expect(screen.getByDisplayValue('pan')).toBeInTheDocument();
  expect(campo('pan', 'kcal')).toHaveValue('0');
});

test('Guardar está desactivado sin alimentos', async () => {
  abrir('/revision', { fecha: hoy, texto: true });
  expect(await screen.findByRole('button', { name: 'Guardar' })).toBeDisabled();
});

test('editar una comida existente la actualiza con el mismo id', async () => {
  const u = userEvent.setup();
  const id = await guardarComida(comida(hoy, [arroz], { tipo: 'cena' }));
  abrir('/revision', { fecha: hoy, comidaId: id });
  const gramos = await screen.findByLabelText('Gramos');
  expect(screen.getByLabelText('Tipo de comida')).toHaveValue('cena');
  await u.clear(gramos);
  await u.type(gramos, '90');
  await u.click(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByText('117 / 1.900 kcal');
  const guardadas = await comidasDe(hoy);
  expect(guardadas).toHaveLength(1);
  expect(guardadas[0].id).toBe(id);
  expect(guardadas[0].hora).toBe('12:00');
});

test('borrar comida pide confirmación', async () => {
  const u = userEvent.setup();
  const id = await guardarComida(comida(hoy, [arroz]));
  const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  abrir('/revision', { fecha: hoy, comidaId: id });
  const boton = await screen.findByRole('button', { name: 'Borrar comida' });
  await u.click(boton);
  expect(await comidasDe(hoy)).toHaveLength(1);
  await u.click(boton);
  await screen.findByText('0 / 1.900 kcal');
  expect(confirmar).toHaveBeenCalledTimes(2);
  expect(await comidasDe(hoy)).toHaveLength(0);
});

test('sin datos de navegación vuelve a Hoy', async () => {
  abrir('/revision');
  expect(await screen.findByText('0 / 1.900 kcal')).toBeInTheDocument();
});
