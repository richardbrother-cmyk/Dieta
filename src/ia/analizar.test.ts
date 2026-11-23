import { APIConnectionError, APIError } from '@anthropic-ai/sdk';
import { analizarFoto, estimarTexto, probarClave } from './analizar';

const { parse, create, constructor } = vi.hoisted(() => ({
  parse: vi.fn(),
  create: vi.fn(),
  constructor: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', async (original) => {
  const real = await original<typeof import('@anthropic-ai/sdk')>();
  class Falso {
    beta = { messages: { parse } };
    messages = { create };
    constructor(opciones: unknown) {
      constructor(opciones);
    }
  }
  return { ...real, default: Falso };
});

const arroz = { nombre: 'Arroz', gramos: 180, kcal: 234, proteina_g: 4, carbos_g: 52, grasa_g: 0 };
const respuesta = (parsed_output: unknown, stop_reason = 'end_turn') => ({ parsed_output, stop_reason });
const errorHttp = (estado: number, mensaje = 'x') =>
  APIError.generate(estado, { error: { message: mensaje } }, mensaje, new Headers());

beforeEach(() => {
  parse.mockReset();
  create.mockReset();
  constructor.mockReset();
});

test('envía la foto con los parámetros acordados', async () => {
  parse.mockResolvedValue(respuesta({ es_comida: true, alimentos: [arroz], nota: 'x' }));
  await analizarFoto('QUJD', 'sk-ant-1');
  expect(constructor).toHaveBeenCalledWith(
    expect.objectContaining({ apiKey: 'sk-ant-1', dangerouslyAllowBrowser: true }),
  );
  const p = parse.mock.calls[0][0];
  expect(p.model).toBe('claude-opus-5-5');
  expect(p.max_tokens).toBe(16000);
  expect(p.thinking).toEqual({ type: 'adaptive' });
  expect(p.output_config.effort).toBe('low');
  expect(p.output_config.format).toBeDefined();
  expect(p.fallbacks).toBe('default');
  expect(p.betas).toContain('server-side-fallback-2026-07-01');
  const contenido = p.messages[0].content;
  expect(contenido[0]).toEqual({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' },
  });
  expect(contenido[1].type).toBe('text');
});

test('devuelve alimentos y nota', async () => {
  parse.mockResolvedValue(respuesta({ es_comida: true, alimentos: [arroz], nota: 'asumí aceite' }));
  expect(await analizarFoto('QUJD', 'k')).toEqual({ alimentos: [arroz], nota: 'asumí aceite' });
});

test('los valores negativos o no finitos salen como 0', async () => {
  parse.mockResolvedValue(
    respuesta({ es_comida: true, alimentos: [{ ...arroz, kcal: -5, grasa_g: NaN }], nota: '' }),
  );
  const r = await analizarFoto('QUJD', 'k');
  expect(r.alimentos[0].kcal).toBe(0);
  expect(r.alimentos[0].grasa_g).toBe(0);
});

test.each([
  ['no es comida', respuesta({ es_comida: false, alimentos: [], nota: '' }), 'no_es_comida'],
  ['sin alimentos', respuesta({ es_comida: true, alimentos: [], nota: '' }), 'sin_datos'],
  ['rechazo', respuesta(null, 'refusal'), 'rechazo'],
  ['salida fuera del esquema', respuesta(null), 'sin_datos'],
])('%s', async (_n, r, codigo) => {
  parse.mockResolvedValue(r);
  await expect(analizarFoto('QUJD', 'k')).rejects.toMatchObject({ codigo });
});

test.each([
  [errorHttp(401), 'clave_invalida'],
  [errorHttp(403), 'clave_invalida'],
  [errorHttp(429), 'limite'],
  [errorHttp(400, 'Your credit balance is too low'), 'limite'],
  [errorHttp(400, 'otra cosa'), 'sin_datos'],
  [errorHttp(500), 'sin_datos'],
  [new APIConnectionError({ message: 'sin red' }), 'sin_conexion'],
  [new Error('raro'), 'sin_datos'],
])('error %# se traduce', async (error, codigo) => {
  parse.mockRejectedValue(error);
  await expect(analizarFoto('QUJD', 'k')).rejects.toMatchObject({ codigo });
});

test('estimarTexto no envía imagen e incluye la descripción', async () => {
  parse.mockResolvedValue(respuesta({ es_comida: true, alimentos: [arroz], nota: '' }));
  await estimarTexto('2 huevos revueltos', 'k');
  const contenido = parse.mock.calls[0][0].messages[0].content;
  const bloques = Array.isArray(contenido) ? contenido : [{ type: 'text', text: contenido }];
  expect(bloques.some((b: { type: string }) => b.type === 'image')).toBe(false);
  expect(JSON.stringify(bloques)).toContain('2 huevos revueltos');
});

test('sin clave no llama a la API', async () => {
  await expect(analizarFoto('QUJD', '  ')).rejects.toMatchObject({ codigo: 'clave_invalida' });
  expect(constructor).not.toHaveBeenCalled();
});

test('probarClave resuelve con una clave que funciona y traduce el error si no', async () => {
  create.mockResolvedValue({});
  await expect(probarClave('k')).resolves.toBeUndefined();
  create.mockRejectedValue(errorHttp(401));
  await expect(probarClave('k')).rejects.toMatchObject({ codigo: 'clave_invalida' });
});
