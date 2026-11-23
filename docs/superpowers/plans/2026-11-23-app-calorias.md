# Dieta (app de calorías por foto) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA personal en español que registra comidas a partir de una foto (alimentos, gramos, calorías y macros estimados por Claude), muestra el avance diario frente a una meta y lleva historial y peso.

**Architecture:** Sitio estático Vite + React + TypeScript. La lógica pura vive en `src/dominio`, la persistencia (Dexie/IndexedDB + `localStorage`) en `src/datos`, la llamada a Claude en `src/ia`, y las pantallas en `src/pantallas`. Las pantallas leen la base con `useLiveQuery` y no contienen cálculo.

**Tech Stack:** Vite, React 18, TypeScript, react-router (HashRouter), Dexie + dexie-react-hooks, `@anthropic-ai/sdk`, zod, vite-plugin-pwa, Vitest + Testing Library + fake-indexeddb, Playwright, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-23-app-calorias-design.md`

## Global Constraints

- Interfaz y textos en español. Identificadores de dominio en español, como en el spec (`Comida`, `Alimento`, `metaKcal`).
- Sin servidor, sin cuentas, sin costos fijos: todo corre en el navegador.
- Teléfono objetivo: Android (Chrome). No romper iOS, pero no se verifica allí.
- Modelo `claude-opus-5-5`, pensamiento adaptativo, esfuerzo `low`, `max_tokens` 16000, sin streaming, fallbacks del servidor en modo `default`.
- La clave de API vive solo en `localStorage`; nunca se exporta, se registra en logs ni se sube al repositorio o a CI.
- Fechas: fecha local del teléfono en formato `YYYY-MM-DD`, nunca UTC.
- Toda cifra nutricional se presenta como estimación.
- Vite `base: '/Dieta/'` (nombre del repositorio en GitHub Pages).
- Números mostrados: kcal enteras, gramos de macros enteros, peso con un decimal.

## Review Focus

1. **Foto grande o de formato raro** (12 MP o más, HEIC de la galería, archivo que no es imagen): se reduce a 1.568 px y se envía; si no se puede decodificar, mensaje claro y opción de cargar a mano. → Task 5.
2. **Valores absurdos del modelo o del usuario** (gramos 0, negativos, vacío, `NaN`): nunca división por cero ni `NaN` en pantalla; los campos numéricos se acotan a ≥ 0. → Task 3 y Task 7.
3. **Medianoche y zona horaria**: una comida a las 23:30 hora local pertenece a ese día, no al siguiente en UTC. → Task 3.
4. **Importar un archivo corrupto o ajeno**: se rechaza con mensaje y los datos actuales quedan intactos. → Task 4.
5. **Doble toque en Guardar o fallo al guardar** (cuota llena): se crea una sola comida; si falla, la pantalla de revisión conserva lo editado y lo dice. → Task 7.

---

## Estructura de archivos

```
index.html, vite.config.ts, tsconfig.json, package.json, playwright.config.ts
public/icon-192.png, public/icon-512.png
.github/workflows/deploy.yml
src/main.tsx                 arranque, HashRouter, registro del service worker
src/App.tsx                  rutas, barra de pestañas, redirección de primer uso
src/estilos.css
src/dominio/tipos.ts         tipos del dominio
src/dominio/fechas.ts        fecha local, tipo de comida por hora
src/dominio/metas.ts         Mifflin-St Jeor, meta de kcal y proteína
src/dominio/calculos.ts      escalar alimento, totales, cumplió, promedios, media móvil
src/datos/db.ts              esquema Dexie
src/datos/repositorio.ts     operaciones sobre comidas, días y pesos
src/datos/ajustes.ts         ajustes en localStorage + hook
src/datos/respaldo.ts        exportar, importar, compartir, aviso de respaldo
src/ia/imagen.ts             reducir foto y generar miniatura
src/ia/analizar.ts           llamadas a Claude y mapeo de errores
src/pantallas/Hoy.tsx, Revision.tsx, Historial.tsx, DiaDetalle.tsx, Peso.tsx, Ajustes.tsx
src/componentes/BarraProgreso.tsx, ListaComidas.tsx, FilaAlimento.tsx, GraficaPeso.tsx, EntradaTexto.tsx
e2e/flujo.spec.ts
```

Cada módulo de `src/dominio`, `src/datos` y `src/ia` tiene su prueba al lado: `nombre.test.ts`.

---

### Task 1: Andamiaje del proyecto

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/estilos.css`, `src/setupTests.ts`, `public/icon-192.png`, `public/icon-512.png`, `.gitignore`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: rutas `#/` (Hoy), `#/historial`, `#/historial/:fecha`, `#/peso`, `#/ajustes`, `#/revision`; scripts `npm run dev`, `npm run build`, `npm test` (Vitest, entorno jsdom, `fake-indexeddb/auto` cargado en `setupTests.ts`), `npm run e2e`.

- [ ] **Step 1:** Crear el proyecto Vite React-TS en la raíz e instalar: `react-router-dom dexie dexie-react-hooks @anthropic-ai/sdk zod` y de desarrollo `vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom fake-indexeddb vite-plugin-pwa @playwright/test`. No ejecutar `playwright install` (Chromium ya está en el entorno).
- [ ] **Step 2:** Escribir la prueba que falla en `src/App.test.tsx`:

```tsx
test('muestra las cuatro pestañas', () => {
  render(<MemoryRouter><App /></MemoryRouter>);
  for (const n of ['Hoy', 'Historial', 'Peso', 'Ajustes'])
    expect(screen.getByRole('link', { name: n })).toBeInTheDocument();
});
```

- [ ] **Step 3:** `npm test` → FALLA (App no tiene pestañas).
- [ ] **Step 4:** Implementar `App.tsx` con la barra inferior y pantallas vacías; `main.tsx` con `HashRouter`. Configurar `vite.config.ts` con `base: '/Dieta/'` y `VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Dieta', short_name: 'Dieta', lang: 'es', display: 'standalone', start_url: '/Dieta/', icons: [192, 512] } })`. Generar los dos iconos PNG (un color sólido con la letra D basta).
- [ ] **Step 5:** `npm test` → PASA. `npm run build` → termina sin errores y `dist/manifest.webmanifest` existe.
- [ ] **Step 6:** Commit `chore: scaffold Vite React PWA`.

---

### Task 2: Tipos y cálculo de metas

**Files:**
- Create: `src/dominio/tipos.ts`, `src/dominio/metas.ts`
- Test: `src/dominio/metas.test.ts`

**Interfaces:**
- Produces:

```ts
// tipos.ts
export type Sexo = 'hombre' | 'mujer';
export type Actividad = 'sedentario' | 'ligero' | 'moderado' | 'alto';
export type TipoComida = 'desayuno' | 'almuerzo' | 'cena' | 'merienda';
export interface Perfil { sexo: Sexo; edad: number; estaturaCm: number; pesoKg: number; actividad: Actividad }
export interface Alimento { nombre: string; gramos: number; kcal: number; proteina_g: number; carbos_g: number; grasa_g: number }
export interface Comida { id: string; fecha: string; hora: string; tipo: TipoComida; miniatura: Blob | null; alimentos: Alimento[]; nota: string }
export interface Dia { fecha: string; metaKcal: number; metaProteina: number }
export interface Peso { fecha: string; kg: number }
export interface Ajustes { perfil: Perfil | null; metaKcal: number; metaProteina: number; metaManual: boolean; apiKey: string }
export interface Totales { kcal: number; proteina_g: number; carbos_g: number; grasa_g: number }

// metas.ts
export const FACTOR_ACTIVIDAD: Record<Actividad, number>; // 1.2, 1.375, 1.55, 1.725
export const PISO_KCAL: Record<Sexo, number>;             // hombre 1500, mujer 1200
export function metabolismoBasal(p: Perfil): number;
export function calcularMetas(p: Perfil): { metaKcal: number; metaProteina: number };
export function bajoElPiso(kcal: number, sexo: Sexo): boolean;
```

- [ ] **Step 1:** Escribir pruebas que fallan:

```ts
const h: Perfil = { sexo: 'hombre', edad: 30, estaturaCm: 175, pesoKg: 80, actividad: 'moderado' };
test('basal Mifflin hombre', () => expect(metabolismoBasal(h)).toBeCloseTo(1748.75));
test('basal Mifflin mujer', () =>
  expect(metabolismoBasal({ ...h, sexo: 'mujer' })).toBeCloseTo(1582.75));
test('meta: gasto × 0.80 redondeado a 50', () =>
  expect(calcularMetas(h).metaKcal).toBe(2150)); // 1748.75 × 1.55 × 0.8 = 2168.45
test('proteína 1.8 g/kg redondeada a 5', () =>
  expect(calcularMetas(h).metaProteina).toBe(145)); // 144
test('piso mujer 1200', () =>
  expect(calcularMetas({ sexo: 'mujer', edad: 60, estaturaCm: 150, pesoKg: 45, actividad: 'sedentario' }).metaKcal).toBe(1200));
test('piso hombre 1500', () =>
  expect(calcularMetas({ sexo: 'hombre', edad: 70, estaturaCm: 160, pesoKg: 50, actividad: 'sedentario' }).metaKcal).toBe(1500));
test('bajoElPiso', () => { expect(bajoElPiso(1400, 'hombre')).toBe(true); expect(bajoElPiso(1200, 'mujer')).toBe(false); });
```

- [ ] **Step 2:** `npx vitest run src/dominio/metas.test.ts` → FALLA.
- [ ] **Step 3:** Implementar `tipos.ts` y `metas.ts` con las fórmulas de la sección "Cálculo de la meta" del spec.
- [ ] **Step 4:** Mismo comando → PASA.
- [ ] **Step 5:** Commit `feat: domain types and goal calculation`.

---

### Task 3: Fechas y cálculos de comidas y peso

**Files:**
- Create: `src/dominio/fechas.ts`, `src/dominio/calculos.ts`
- Test: `src/dominio/fechas.test.ts`, `src/dominio/calculos.test.ts`

**Interfaces:**
- Consumes: tipos de Task 2.
- Produces:

```ts
// fechas.ts
export function fechaLocal(d?: Date): string;       // 'YYYY-MM-DD' en hora local
export function horaLocal(d?: Date): string;        // 'HH:mm'
export function tipoPorHora(d?: Date): TipoComida;  // <11 desayuno, <16 almuerzo, <19 merienda, resto cena
export function etiquetaFecha(fecha: string): string; // 'lun 23 nov'

// calculos.ts
export function limpiarNumero(v: unknown): number;  // no finito o negativo → 0
export function escalarAlimento(a: Alimento, gramosNuevos: number): Alimento;
export function totalesDe(alimentos: Alimento[]): Totales;
export function totalesDelDia(comidas: Comida[]): Totales;
export function cumplioMeta(comidas: Comida[], dia: Dia): boolean;
export function promedio7(comidasPorFecha: Map<string, Comida[]>, hoy: string): Totales | null;
export function mediaMovil7(pesos: Peso[]): Array<{ fecha: string; kg: number; media: number }>;
```

- [ ] **Step 1:** Escribir pruebas que fallan. Casos obligatorios:

```ts
// fechas
test('23:30 local pertenece a ese día', () =>
  expect(fechaLocal(new Date(2026, 10, 23, 23, 30))).toBe('2026-11-23'));
test('00:10 local es el día siguiente', () =>
  expect(fechaLocal(new Date(2026, 10, 24, 0, 10))).toBe('2026-11-24'));
test.each([[8, 'desayuno'], [13, 'almuerzo'], [17, 'merienda'], [21, 'cena']])('tipoPorHora %i', (h, t) =>
  expect(tipoPorHora(new Date(2026, 0, 1, h))).toBe(t));

// calculos
const arroz: Alimento = { nombre: 'Arroz', gramos: 180, kcal: 234, proteina_g: 4, carbos_g: 52, grasa_g: 0 };
test('escalar a la mitad', () =>
  expect(escalarAlimento(arroz, 90)).toMatchObject({ gramos: 90, kcal: 117, carbos_g: 26 }));
test('escalar desde gramos 0 no produce NaN', () => {
  const r = escalarAlimento({ ...arroz, gramos: 0 }, 100);
  expect(Object.values(r).every(v => typeof v !== 'number' || Number.isFinite(v))).toBe(true);
  expect(r.gramos).toBe(100); expect(r.kcal).toBe(234); // sin base para escalar: conserva los valores
});
test('escalar con NaN o negativo → gramos 0 y todo 0', () => {
  expect(escalarAlimento(arroz, NaN).kcal).toBe(0);
  expect(escalarAlimento(arroz, -5).gramos).toBe(0);
});
test('totales suman e ignoran no finitos', () =>
  expect(totalesDe([arroz, { ...arroz, kcal: NaN }]).kcal).toBe(234));
test('cumplió: con comidas y kcal ≤ meta', () => { /* 234 vs meta 2000 → true */ });
test('no cumplió: día sin comidas', () => { /* [] → false */ });
test('no cumplió: kcal > meta', () => { /* 234 vs meta 200 → false */ });
test('promedio7 excluye hoy y días vacíos', () => { /* ayer 2000, anteayer 1000, hoy 500 → kcal 1500 */ });
test('promedio7 sin días → null', () => {});
test('mediaMovil7 promedia hasta los 7 registros anteriores inclusive', () => { /* 80, 79, 78 → medias 80, 79.5, 79 */ });
```

Completar los cuerpos esbozados con datos concretos que den esos resultados.

- [ ] **Step 2:** `npx vitest run src/dominio` → FALLA.
- [ ] **Step 3:** Implementar. `fechaLocal` usa `getFullYear/getMonth/getDate`, nunca `toISOString`. `promedio7` toma los 7 días calendario anteriores a `hoy`.
- [ ] **Step 4:** Mismo comando → PASA.
- [ ] **Step 5:** Commit `feat: date helpers and meal/weight calculations`.

---

### Task 4: Persistencia y respaldo

**Files:**
- Create: `src/datos/db.ts`, `src/datos/repositorio.ts`, `src/datos/ajustes.ts`, `src/datos/respaldo.ts`
- Test: `src/datos/repositorio.test.ts`, `src/datos/ajustes.test.ts`, `src/datos/respaldo.test.ts`

**Interfaces:**
- Consumes: tipos (Task 2), `fechaLocal` (Task 3), `calcularMetas` (Task 2).
- Produces:

```ts
// db.ts
export const db: Dexie & { comidas: Table<Comida, string>; dias: Table<Dia, string>; pesos: Table<Peso, string> };
// stores: comidas 'id, fecha', dias 'fecha', pesos 'fecha'

// repositorio.ts
export function guardarComida(c: Omit<Comida, 'id'> & { id?: string }): Promise<string>; // crea Dia de esa fecha si falta, con la meta actual
export function borrarComida(id: string): Promise<void>;
export function comidasDe(fecha: string): Promise<Comida[]>;      // ordenadas por hora
export function diaDe(fecha: string): Promise<Dia | undefined>;
export function actualizarMetaDeHoy(metaKcal: number, metaProteina: number): Promise<void>; // solo toca el Dia de hoy si existe
export function fechasConComidas(): Promise<string[]>;            // descendente
export function guardarPeso(fecha: string, kg: number): Promise<void>; // reemplaza el del mismo día
export function pesos(): Promise<Peso[]>;                         // ascendente por fecha
export function borrarTodo(): Promise<void>;                      // tablas + ajustes + marca de respaldo

// ajustes.ts  (clave localStorage 'dieta.ajustes')
export const AJUSTES_INICIALES: Ajustes; // perfil null, metas 0, metaManual false, apiKey ''
export function leerAjustes(): Ajustes;
export function guardarAjustes(a: Ajustes): void;   // si !metaManual y hay perfil, recalcula metas; llama actualizarMetaDeHoy
export function useAjustes(): [Ajustes, (a: Ajustes) => void];
export function configuracionCompleta(a: Ajustes): boolean; // perfil y apiKey presentes

// respaldo.ts  (clave localStorage 'dieta.ultimoRespaldo')
export interface Respaldo { version: 1; exportado: string; comidas: Array<Omit<Comida,'miniatura'> & { miniatura: string | null }>; dias: Dia[]; pesos: Peso[]; ajustes: Omit<Ajustes, 'apiKey'> }
export function exportar(): Promise<Respaldo>;            // miniaturas como data URL base64
export function importar(json: unknown): Promise<void>;   // valida con zod; lanza Error('Archivo no válido') sin tocar datos
export function compartirRespaldo(): Promise<void>;       // navigator.share({files}) si canShare, si no descarga; marca la fecha
export function diasSinRespaldo(hoy: string): Promise<number | null>; // null si no hay datos posteriores al último respaldo
export function pedirPersistencia(): Promise<void>;       // navigator.storage?.persist?.()
```

- [ ] **Step 1:** Escribir pruebas que fallan (cada una empieza con `await borrarTodo()`):
  - `guardarComida` crea el `Dia` con la meta de `leerAjustes()`; una segunda comida el mismo día no lo cambia.
  - Cambiar la meta con `guardarAjustes` actualiza el `Dia` de hoy y deja igual el de `'2026-01-01'`.
  - `guardarPeso` dos veces en la misma fecha deja un solo registro con el último valor.
  - `guardarAjustes` con `metaManual: false` y perfil recalcula; con `metaManual: true` conserva los valores dados.
  - `leerAjustes` con `localStorage` vacío o JSON roto devuelve `AJUSTES_INICIALES`.
  - Ida y vuelta: sembrar 2 comidas (una con miniatura `Blob`), 1 día, 2 pesos → `exportar()` → `borrarTodo()` → `importar()` → los datos son iguales y la miniatura vuelve a ser `Blob` del mismo tamaño.
  - El respaldo exportado no contiene la propiedad `apiKey` ni el valor de la clave en ninguna parte del JSON; importar conserva la `apiKey` actual.
  - `importar({ foo: 1 })`, `importar('texto')` e `importar` con `version: 2` rechazan con `'Archivo no válido'` y `comidasDe` sigue devolviendo lo que había.
  - `diasSinRespaldo`: sin respaldo previo y con comidas → días desde la primera comida; tras `compartirRespaldo` (con `navigator.share` simulado) → `null`.
- [ ] **Step 2:** `npx vitest run src/datos` → FALLA.
- [ ] **Step 3:** Implementar. `importar` valida todo antes de abrir una única transacción que borra y escribe. `id` con `crypto.randomUUID()`.
- [ ] **Step 4:** Mismo comando → PASA.
- [ ] **Step 5:** Commit `feat: local storage, repository and backup`.

---

### Task 5: Imagen y análisis con Claude

**Files:**
- Create: `src/ia/imagen.ts`, `src/ia/analizar.ts`
- Test: `src/ia/analizar.test.ts`, `src/ia/imagen.test.ts`

**Interfaces:**
- Consumes: `Alimento` (Task 2), `limpiarNumero` (Task 3).
- Produces:

```ts
// imagen.ts
export const LADO_MAXIMO = 1568; export const LADO_MINIATURA = 400;
export function dimensionesReducidas(ancho: number, alto: number, max: number): { ancho: number; alto: number }; // nunca amplía
export function prepararFoto(archivo: Blob): Promise<{ base64: string; miniatura: Blob }>; // JPEG; lanza ErrorAnalisis('imagen_ilegible')

// analizar.ts
export type CodigoError = 'clave_invalida' | 'limite' | 'sin_conexion' | 'rechazo' | 'no_es_comida' | 'imagen_ilegible' | 'sin_datos';
export class ErrorAnalisis extends Error { constructor(public codigo: CodigoError) }
export const MENSAJES: Record<CodigoError, string>;  // texto en español para la interfaz
export interface Estimacion { alimentos: Alimento[]; nota: string }
export function analizarFoto(base64Jpeg: string, apiKey: string): Promise<Estimacion>;
export function estimarTexto(descripcion: string, apiKey: string): Promise<Estimacion>;
export function probarClave(apiKey: string): Promise<void>; // lanza ErrorAnalisis si falla
```

- [ ] **Step 1:** Antes de escribir código, leer los tipos del SDK instalado (`node_modules/@anthropic-ai/sdk`) para confirmar: opción de cliente `dangerouslyAllowBrowser`, `zodOutputFormat` en `@anthropic-ai/sdk/helpers/zod`, forma de `fallbacks: 'default'` con `betas: ['server-side-fallback-2026-07-01']` en `client.beta.messages`, y si existe `client.beta.messages.parse`. Si no existe, usar `client.beta.messages.create` con `output_config.format` y validar el texto JSON con el mismo esquema zod. Los nombres de las clases de error se toman de los tipos, no de memoria.
- [ ] **Step 2:** Escribir pruebas que fallan, simulando el módulo `@anthropic-ai/sdk` con `vi.mock`:
  - `dimensionesReducidas(4000, 3000, 1568)` → `{ ancho: 1568, alto: 1176 }`; `(800, 600, 1568)` → sin cambio; `(3000, 4000, 1568)` → `{ ancho: 1176, alto: 1568 }`.
  - `prepararFoto(new Blob(['no soy imagen']))` rechaza con código `imagen_ilegible`.
  - `analizarFoto` envía `model: 'claude-opus-5-5'`, `output_config.effort: 'low'`, `max_tokens: 16000`, un bloque `image` base64 `image/jpeg` antes del bloque de texto, y `fallbacks: 'default'`.
  - Respuesta `{ es_comida: true, alimentos: [arroz], nota: 'x' }` → devuelve `{ alimentos: [arroz], nota: 'x' }`.
  - Valores negativos o no finitos en la respuesta salen como 0 (pasan por `limpiarNumero`).
  - `es_comida: false` → `ErrorAnalisis` `no_es_comida`. `alimentos: []` con `es_comida: true` → `sin_datos`.
  - `stop_reason: 'refusal'` → `rechazo`. Salida que no cumple el esquema → `sin_datos`.
  - Error 401 y 403 → `clave_invalida`; 429 → `limite`; 400 cuyo mensaje menciona "credit balance" → `limite`; error de conexión → `sin_conexion`; cualquier otro → `sin_datos`.
  - `estimarTexto` no envía bloque `image` e incluye la descripción en el mensaje.
  - `apiKey` vacía → `clave_invalida` sin llamar al SDK.
- [ ] **Step 3:** `npx vitest run src/ia` → FALLA.
- [ ] **Step 4:** Implementar. Esquema zod igual al de la sección "Análisis de la foto" del spec. La instrucción del sistema, en español, pide: identificar cada alimento visible, estimar gramos usando plato y cubiertos como referencia, incluir aceite o salsas probables y decirlo en `nota`, nombres en español, y `es_comida: false` con lista vacía si no hay comida. `prepararFoto` decodifica con `createImageBitmap` y dibuja en `canvas` (calidad JPEG 0,85 para el envío, 0,7 para la miniatura). `probarClave` hace una llamada mínima con `max_tokens: 16`.
- [ ] **Step 5:** Mismo comando → PASA.
- [ ] **Step 6:** Commit `feat: photo preparation and Claude analysis`.

---

### Task 6: Ajustes y primer uso

**Files:**
- Create: `src/pantallas/Ajustes.tsx`
- Modify: `src/App.tsx`
- Test: `src/pantallas/Ajustes.test.tsx`

**Interfaces:**
- Consumes: `useAjustes`, `configuracionCompleta`, `calcularMetas`, `bajoElPiso`, `probarClave`, `MENSAJES`, `compartirRespaldo`, `importar`, `borrarTodo`, `pedirPersistencia`.
- Produces: pantalla en `#/ajustes`; `App` redirige a `#/ajustes` mientras `configuracionCompleta` sea falso y llama a `pedirPersistencia()` una vez al arrancar.

- [ ] **Step 1:** Escribir pruebas que fallan:
  - Sin configuración, abrir `/` muestra el encabezado "Ajustes" y el texto "Completa tu perfil y tu clave para empezar".
  - Llenar perfil (hombre, 30, 175, 80, moderado) muestra "2.150 kcal" y "145 g" como metas calculadas.
  - Activar "Fijar meta a mano" y escribir 1300 muestra la advertencia "Por debajo del mínimo recomendado".
  - Botón "Probar clave": con `probarClave` resuelto muestra "Clave válida"; rechazado con `clave_invalida` muestra `MENSAJES.clave_invalida`.
  - El campo de la clave es `type="password"`.
  - "Borrar todos los datos" pide confirmación; al cancelar no llama a `borrarTodo`.
  - Importar un archivo inválido muestra "Archivo no válido".
  - Está presente la línea "Valores orientativos; no reemplazan el consejo de un profesional de salud."
- [ ] **Step 2:** `npx vitest run src/pantallas/Ajustes.test.tsx` → FALLA.
- [ ] **Step 3:** Implementar la pantalla con las cinco secciones del spec (Perfil, Meta, Clave con enlace a `https://console.anthropic.com` y la recomendación de poner un límite de gasto mensual, Respaldo, Borrar).
- [ ] **Step 4:** Mismo comando → PASA.
- [ ] **Step 5:** Commit `feat: settings and first-run setup`.

---

### Task 7: Hoy, captura y revisión

**Files:**
- Create: `src/pantallas/Hoy.tsx`, `src/pantallas/Revision.tsx`, `src/componentes/BarraProgreso.tsx`, `src/componentes/ListaComidas.tsx`, `src/componentes/FilaAlimento.tsx`, `src/componentes/EntradaTexto.tsx`
- Test: `src/pantallas/Hoy.test.tsx`, `src/pantallas/Revision.test.tsx`

**Interfaces:**
- Consumes: repositorio (Task 4), `totalesDelDia`, `totalesDe`, `escalarAlimento`, `limpiarNumero`, `tipoPorHora`, `fechaLocal`, `horaLocal`, `prepararFoto`, `analizarFoto`, `estimarTexto`, `MENSAJES`, `diasSinRespaldo`.
- Produces:
  - `Revision` recibe por estado de navegación `{ fecha: string; comidaId?: string; foto?: Blob; texto?: boolean }`: con `foto` analiza; con `texto` abre la entrada de texto; con `comidaId` edita una comida existente.
  - `<ListaComidas fecha={string} />`: comidas del día, cada una enlaza a Revisión en modo edición. La reutiliza Task 8.
  - `<BarraProgreso valor={number} meta={number} />`.

- [ ] **Step 1:** Escribir pruebas que fallan.

  Hoy:
  - Con meta 1900 y comidas que suman 1240 muestra "1.240 / 1.900 kcal" y "quedan 660".
  - Con 2000 de 1900 muestra "sobran 100" y la barra tiene la clase `excedido`.
  - Muestra proteína "85 / 140 g".
  - Hay dos entradas de archivo: una con `capture="environment"` ("Foto del plato") y otra sin `capture` ("Elegir de la galería"), y el botón "Agregar a mano".
  - Si `diasSinRespaldo` devuelve 9 muestra "Llevas 9 días sin respaldo"; con `null` o 7 no lo muestra.

  Revisión:
  - Con `foto`: muestra "Analizando…", luego los alimentos devueltos, la `nota` y el texto "Estimación, corrige si hace falta".
  - Cambiar los gramos de 180 a 90 cambia las kcal de esa fila a 117 y el total.
  - Borrar el contenido del campo de gramos muestra 0 kcal, nunca "NaN".
  - Editar kcal directamente no cambia los gramos; renombrar no cambia números.
  - El selector de tipo arranca en `tipoPorHora()`.
  - "Guardar" crea una comida con la miniatura y vuelve a Hoy; dos clics rápidos crean una sola (el botón se desactiva al primer clic).
  - Si `guardarComida` rechaza, muestra "No se pudo guardar" y los alimentos editados siguen en pantalla.
  - Si `analizarFoto` rechaza con `no_es_comida` muestra `MENSAJES.no_es_comida` con los botones "Reintentar" y "Cargar a mano"; la miniatura sigue visible.
  - Con `clave_invalida` aparece además un enlace a Ajustes.
  - "Agregar alimento" abre `EntradaTexto`; enviar "2 huevos" llama a `estimarTexto` y añade sus filas a la lista existente.
  - Si `estimarTexto` falla, ofrece "Escribir los números a mano", que añade una fila vacía editable.
  - En modo edición (`comidaId`) carga la comida, "Guardar" la actualiza con el mismo `id` y hay un botón "Borrar comida" con confirmación.
  - "Guardar" está desactivado si no hay alimentos.
- [ ] **Step 2:** `npx vitest run src/pantallas/Hoy.test.tsx src/pantallas/Revision.test.tsx` → FALLA.
- [ ] **Step 3:** Implementar siguiendo los bocetos del spec. Los campos numéricos usan `inputMode="decimal"` y pasan por `limpiarNumero`. Formato de miles con `toLocaleString('es')`.
- [ ] **Step 4:** Mismo comando → PASA.
- [ ] **Step 5:** Commit `feat: today screen, capture and review flow`.

---

### Task 8: Historial

**Files:**
- Create: `src/pantallas/Historial.tsx`, `src/pantallas/DiaDetalle.tsx`
- Test: `src/pantallas/Historial.test.tsx`

**Interfaces:**
- Consumes: `fechasConComidas`, `comidasDe`, `diaDe`, `totalesDelDia`, `cumplioMeta`, `promedio7`, `etiquetaFecha`, `ListaComidas`, ruta de Revisión (Task 7).

- [ ] **Step 1:** Escribir pruebas que fallan, sembrando tres días anteriores y el de hoy:
  - La lista va del más reciente al más antiguo, cada fila con kcal y proteína del día.
  - Un día con 1.800 kcal y `Dia.metaKcal` 1.900 muestra "Cumplió" aunque la meta actual en ajustes sea 1.500.
  - Un día con 2.100 de 1.900 muestra "Se pasó".
  - La proteína se marca alcanzada o no por separado y no afecta a "Cumplió".
  - El encabezado "Promedio de 7 días" no incluye hoy; sin días anteriores muestra "Aún no hay datos".
  - `#/historial/2026-11-20` lista las comidas de ese día y "Agregar comida" navega a Revisión con `fecha: '2026-11-20'`.
- [ ] **Step 2:** `npx vitest run src/pantallas/Historial.test.tsx` → FALLA.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Mismo comando → PASA.
- [ ] **Step 5:** Commit `feat: history and day detail`.

---

### Task 9: Peso

**Files:**
- Create: `src/pantallas/Peso.tsx`, `src/componentes/GraficaPeso.tsx`
- Test: `src/pantallas/Peso.test.tsx`

**Interfaces:**
- Consumes: `guardarPeso`, `pesos`, `mediaMovil7`, `useAjustes`, `fechaLocal`.

- [ ] **Step 1:** Escribir pruebas que fallan:
  - Guardar 79,5 hoy lo añade; guardar 79,2 el mismo día lo reemplaza (un solo registro).
  - Acepta coma o punto decimal; rechaza vacío, 0 y valores mayores de 400 con "Peso no válido".
  - Con registros 82 → 80 muestra "−2,0 kg desde el inicio".
  - Tras guardar un peso distinto al del perfil aparece "¿Actualizar tu perfil a 79,5 kg?"; al aceptar cambia `perfil.pesoKg` y, si la meta no es manual, la meta mostrada en Ajustes cambia; al rechazar no cambia.
  - Sin registros muestra "Anota tu primer peso"; con uno solo dibuja el punto sin fallar.
  - La gráfica SVG tiene una `polyline` para los registros y otra con clase `media`.
- [ ] **Step 2:** `npx vitest run src/pantallas/Peso.test.tsx` → FALLA.
- [ ] **Step 3:** Implementar. Gráfica en SVG propio, sin librería.
- [ ] **Step 4:** Mismo comando → PASA.
- [ ] **Step 5:** Commit `feat: weight log and trend chart`.

---

### Task 10: Prueba de flujo, publicación y README

**Files:**
- Create: `playwright.config.ts`, `e2e/flujo.spec.ts`, `e2e/plato.jpg`, `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: la app completa.

- [ ] **Step 1:** Escribir `e2e/flujo.spec.ts` contra `npm run build && npx vite preview`, viewport de teléfono Android, interceptando `https://api.anthropic.com/**` con `page.route` para devolver una estimación fija (arroz 180 g / 234 kcal, pollo 150 g / 248 kcal):
  - Primer uso: abre en Ajustes; llenar perfil y clave `sk-ant-prueba`; ir a Hoy.
  - Subir `e2e/plato.jpg` en "Foto del plato" → aparece la revisión con los dos alimentos → Guardar → Hoy muestra "482" kcal y la miniatura.
  - Recargar la página: la comida sigue ahí.
  - Abrir la comida, cambiar el arroz a 90 g, guardar → Hoy muestra "365".
  - Borrar la comida → Hoy muestra "0".
  - Con la ruta respondiendo 401 → mensaje de clave inválida con enlace a Ajustes.
  - Sin desbordamiento horizontal en Hoy a 360 px de ancho (`scrollWidth <= clientWidth`).
- [ ] **Step 2:** `npm run e2e -- --trace off` → corregir lo que falle en la app hasta que PASE.
- [ ] **Step 3:** Crear `.github/workflows/deploy.yml`: en `push` a `main`, `npm ci`, `npm test`, `npm run build`, y publicar `dist` con `actions/upload-pages-artifact` + `actions/deploy-pages` (permisos `pages: write`, `id-token: write`). Sin secretos.
- [ ] **Step 4:** Escribir `README.md` en español: qué es, cómo crear la clave en console.anthropic.com y ponerle límite de gasto, cómo activar Pages (Settings → Pages → Source: GitHub Actions), cómo instalarla en Android (Chrome → menú → "Agregar a pantalla principal"), cómo respaldar, y los comandos de desarrollo.
- [ ] **Step 5:** `npm test && npm run build && npm run e2e -- --trace off` → todo PASA.
- [ ] **Step 6:** Commit `feat: e2e flow, Pages deploy and README`.

---

## Verificación manual pendiente (no automatizable aquí)

- Una foto real con la clave del usuario: que la estimación sea razonable y tarde poco.
- Instalación en el Android del usuario, cámara nativa y hoja de compartir al exportar.
