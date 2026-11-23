import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FOTO = path.join(path.dirname(fileURLToPath(import.meta.url)), 'plato.jpg');

const ESTIMACION = {
  es_comida: true,
  alimentos: [
    { nombre: 'Arroz blanco', gramos: 180, kcal: 234, proteina_g: 4, carbos_g: 52, grasa_g: 0 },
    { nombre: 'Pechuga de pollo', gramos: 150, kcal: 248, proteina_g: 46, carbos_g: 0, grasa_g: 5 },
  ],
  nota: 'Asumí aceite de cocción.',
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

/** Sustituye la API de Anthropic; devuelve las peticiones recibidas. */
async function simularApi(page: Page, estado = 200) {
  const peticiones: Array<Record<string, unknown>> = [];
  await page.route('https://api.anthropic.com/**', async (ruta) => {
    const peticion = ruta.request();
    if (peticion.method() === 'OPTIONS') return ruta.fulfill({ status: 204, headers: CORS });
    peticiones.push(peticion.postDataJSON());
    if (estado !== 200) {
      return ruta.fulfill({
        status: estado,
        headers: CORS,
        contentType: 'application/json',
        body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }),
      });
    }
    return ruta.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'msg_prueba',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [{ type: 'text', text: JSON.stringify(ESTIMACION) }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    });
  });
  return peticiones;
}

async function configurar(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
  await page.getByLabel('Sexo').selectOption('hombre');
  await page.getByLabel('Edad').fill('30');
  await page.getByLabel('Estatura (cm)').fill('175');
  await page.getByLabel('Peso (kg)').fill('80');
  await page.getByLabel('Actividad').selectOption('moderado');
  await page.getByLabel('Clave de API').fill('sk-ant-prueba');
  await expect(page.getByText('2.150 kcal')).toBeVisible();
  await page.getByRole('link', { name: 'Hoy' }).click();
}

test('primer uso, foto, edición y borrado', async ({ page }) => {
  const peticiones = await simularApi(page);
  await configurar(page);
  await expect(page.getByText('0 / 2.150 kcal')).toBeVisible();

  await page.getByLabel('Foto del plato').setInputFiles(FOTO);
  await expect(page.getByText('Estimación, corrige si hace falta')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Arroz blanco' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Pechuga de pollo' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Foto de la comida' })).toBeVisible();

  // La foto viaja como JPEG en base64 con los parámetros acordados.
  const enviado = peticiones[0] as {
    model: string;
    messages: Array<{ content: Array<{ type: string; source?: { media_type: string; data: string } }> }>;
  };
  expect(enviado.model).toBe('claude-opus-5-5');
  const imagen = enviado.messages[0].content[0];
  expect(imagen.type).toBe('image');
  expect(imagen.source!.media_type).toBe('image/jpeg');
  expect(imagen.source!.data.startsWith('/9j/')).toBe(true);

  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('482 / 2.150 kcal')).toBeVisible();
  await expect(page.locator('.lista img.mini')).toBeVisible();

  await page.reload();
  await expect(page.getByText('482 / 2.150 kcal')).toBeVisible();

  // Hoy no se desborda en un teléfono angosto.
  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.locator('.lista a.item').click();
  await expect(page.getByRole('heading', { name: 'Editar comida' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('group', { name: 'Arroz blanco' }).getByLabel('Gramos').fill('90');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('365 / 2.150 kcal')).toBeVisible();

  await page.locator('.lista a.item').click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Borrar comida' }).click();
  await expect(page.getByText('0 / 2.150 kcal')).toBeVisible();
  await expect(page.getByText('Aún no hay comidas')).toBeVisible();
});

test('una clave inválida lleva a Ajustes', async ({ page }) => {
  await simularApi(page, 401);
  await configurar(page);
  await page.getByLabel('Foto del plato').setInputFiles(FOTO);
  await expect(page.getByText('La clave de API no es válida o falta. Revísala en Ajustes.')).toBeVisible();
  await page.getByRole('link', { name: 'Ir a Ajustes' }).click();
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
});

test('peso e historial', async ({ page }) => {
  await simularApi(page);
  await configurar(page);
  await page.getByRole('link', { name: 'Peso' }).click();
  await page.getByLabel('Peso de hoy (kg)').fill('79,5');
  await page.getByRole('button', { name: 'Guardar peso' }).click();
  await expect(page.getByText('79,5 kg').first()).toBeVisible();
  await expect(page.getByRole('img', { name: 'Gráfica de peso' })).toBeVisible();

  await page.getByRole('link', { name: 'Historial' }).click();
  await expect(page.getByText('Todavía no has registrado comidas')).toBeVisible();
});
