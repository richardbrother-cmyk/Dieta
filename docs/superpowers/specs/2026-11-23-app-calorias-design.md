# Dieta: app personal de calorías por foto — diseño

Fecha: 2026-11-23

## Intención

Una sola persona (el dueño del repositorio) quiere bajar de peso y de grasa.
Necesita saber cuánto come cada día sin pesar ni buscar alimentos a mano:
toma una foto del plato, la app reconoce los alimentos y sus porciones,
calcula calorías y macros, y lo deja anotado en el registro del día.

El éxito es que registrar una comida tome menos de medio minuto y que, al
abrir la app, se vea de inmediato cuánto queda del día.

## Objetivos

- Registrar una comida a partir de una foto, con alimentos, gramos, calorías
  y macros estimados, corregibles antes de guardar.
- Mostrar el avance del día frente a una meta de calorías y de proteína.
- Guardar el historial de comidas por día, con su foto.
- Registrar el peso corporal y mostrar su tendencia.
- Funcionar en el teléfono (iPhone o Android) instalada en la pantalla de
  inicio.

## Fuera de alcance

- Cuentas, inicio de sesión, varios usuarios.
- Sincronización entre dispositivos o servidor propio.
- Lector de códigos de barras y base de datos de alimentos.
- Registro de ejercicio, recordatorios y notificaciones.
- Publicación en tiendas de apps.

## Lo que la haría fracasar aunque funcione

- Que registrar una comida sea lento o tenga muchos pasos.
- Que presente las estimaciones como exactas: una foto no permite saber el
  aceite, las salsas ni el peso real. La app debe decir que son estimaciones
  y dejar corregir.
- Que proponga metas de calorías agresivas o peligrosas.
- Que se pierdan los datos sin forma de recuperarlos.

## Restricciones

- Sin costos fijos: sitio estático, sin servidor ni base de datos remota.
- El reconocimiento de la foto usa la API de Claude con una clave que el
  usuario crea y pega en los ajustes. Costo por uso, centavos por foto.
- Interfaz en español.
- Repositorio vacío: no hay código previo que respetar.

## Enfoques considerados

| Enfoque | Qué ofrece | Qué cuesta |
|---|---|---|
| **A. App web instalable (PWA), datos en el teléfono** | Funciona en iPhone y Android, sin tienda ni servidor, rápida de construir | Los datos viven en un solo dispositivo; cambiar de teléfono exige exportar e importar |
| B. App nativa | Mejor integración con la cámara | Cuenta de desarrollador, publicación, y no se puede probar desde este entorno |
| C. Web con servidor y base de datos | Sincroniza entre dispositivos y guarda la clave fuera del teléfono | Hosting de pago y mantenimiento, excesivo para una persona |

**Elegido por el usuario: A.** También aceptó usar la API de Claude con su
propia clave.

## Decisiones técnicas (del autor del diseño, no pedidas por el usuario)

- **Vite + React + TypeScript**, compilado a sitio estático.
- **PWA** con manifiesto y service worker (`vite-plugin-pwa`) para instalarla
  y abrir el registro sin conexión. Analizar una foto sí requiere conexión.
- **Datos en IndexedDB** con Dexie. La clave de API y los ajustes en
  `localStorage`.
- **Cámara** con `<input type="file" accept="image/*" capture="environment">`,
  que abre la cámara nativa en iOS y Android. Un segundo botón, sin
  `capture`, deja elegir una foto de la galería.
- **Claude** con el SDK oficial `@anthropic-ai/sdk` llamado desde el
  navegador (`dangerouslyAllowBrowser: true`), modelo `claude-opus-5-5`,
  respuesta estructurada con `client.messages.parse` y `zodOutputFormat`.
- **Hosting**: GitHub Pages, publicado con un workflow de GitHub Actions.
  Requiere HTTPS, que Pages ya da. El repositorio es público, así que Pages
  es gratis; la dirección del sitio también es pública, pero el sitio no
  contiene datos ni la clave, que viven solo en el teléfono.
- **Pruebas**: Vitest para la lógica, Playwright para el flujo principal con
  la API simulada.

## Pantallas

Navegación inferior con cuatro pestañas: Hoy, Historial, Peso, Ajustes.

### Hoy

```
┌───────────────────────────────┐
│ Hoy, lun 23 nov               │
│ 1.240 / 1.900 kcal            │
│ ████████░░░░  quedan 660      │
│ Proteína 85 / 140 g           │
│ Carbos 120 g · Grasa 45 g     │
│                               │
│ Desayuno      420 kcal [foto] │
│ Almuerzo      820 kcal [foto] │
│                               │
│     [ 📷 Foto del plato ]     │
│     [ + Agregar a mano ]      │
└───────────────────────────────┘
```

- Si se pasa de la meta, la barra cambia de color y dice cuánto sobra.
- Tocar una comida abre su detalle para editarla o borrarla.

### Revisión de una foto

Después de tomar la foto: indicador de "analizando", luego la lista.

```
┌───────────────────────────────┐
│ [foto]            Almuerzo ▾  │
│ Estimación, corrige si hace   │
│ falta                         │
│                               │
│ Arroz blanco    180 g  234 kcal ✕
│ Pechuga a la plancha 150 g 248 kcal ✕
│ Aguacate         50 g   80 kcal ✕
│ [ + Agregar alimento ]        │
│                               │
│ Total 562 kcal · P 52 C 54 G 14
│ [ Guardar ]   [ Descartar ]   │
└───────────────────────────────┘
```

- Cambiar los gramos de un alimento recalcula sus calorías y macros en
  proporción.
- Nombre, gramos, calorías y macros son todos editables directamente.
  Renombrar un alimento no cambia sus números.
- Agregar un alimento (aquí o desde "Agregar a mano" en Hoy): el usuario
  escribe qué comió en texto libre, por ejemplo "2 huevos revueltos con una
  tortilla", y Claude lo estima con el mismo esquema que la foto, sin imagen.
  El resultado entra a esta misma lista para revisarlo. Si no hay conexión o
  falla, queda la opción de escribir los números a mano.
- El tipo de comida (desayuno, almuerzo, cena, merienda) se propone según la
  hora y se puede cambiar.
- Si la foto no contiene comida, o el análisis falla, se muestra un mensaje
  claro con las opciones de reintentar o cargar a mano. La foto no se pierde.

### Historial

Lista de días, del más reciente al más antiguo, con total de calorías y
proteína de cada uno y si cumplió la meta. Arriba, el promedio de los últimos
7 días. Tocar un día abre sus comidas, editables igual que en Hoy, y permite
agregar una comida a ese día.

- Cada día se compara con la meta que estaba vigente ese día, no con la
  actual (ver Datos).
- "Cumplió" significa que el día tiene al menos una comida y sus calorías no
  superan la meta. La proteína se muestra aparte, como alcanzada o no; no
  entra en esa marca.
- El promedio de 7 días usa solo días con al menos una comida y no incluye
  el día en curso.

### Peso

Campo para anotar el peso del día (uno por día; anotar otra vez lo
reemplaza), gráfica de línea con los registros y una media móvil de 7 días,
y el cambio total desde el primer registro.

### Ajustes

- Perfil: sexo, edad, estatura, peso actual, nivel de actividad.
- Meta: calorías y proteína calculadas, con la opción de fijarlas a mano.
- Clave de API de Claude, con un botón para probarla y un enlace a
  console.anthropic.com.
- Exportar e importar todos los datos como un archivo.
- Borrar todos los datos, con confirmación.

En el primer uso la app abre directamente en el perfil y la clave antes de
dejar tomar fotos.

## Cálculo de la meta

- Metabolismo basal con Mifflin-St Jeor:
  hombre `10·kg + 6,25·cm − 5·edad + 5`; mujer igual con `− 161`.
- Gasto diario = basal × factor de actividad
  (sedentario 1,2 · ligero 1,375 · moderado 1,55 · alto 1,725).
- Meta de calorías = gasto diario × 0,80 (déficit del 20 %), redondeada a
  múltiplos de 50.
- Piso de seguridad: la meta calculada no baja de 1.500 kcal (hombre) ni de
  1.200 kcal (mujer). Si el usuario fija a mano un valor por debajo, se
  acepta pero se muestra una advertencia.
- Meta de proteína = 1,8 g por kg de peso corporal, redondeada a 5 g.
- La meta se recalcula cuando cambia el perfil. Registrar un peso nuevo
  ofrece actualizar el peso del perfil, no lo cambia solo.
- Una línea fija en Ajustes aclara que son valores orientativos y no
  reemplazan el consejo de un profesional de salud.

## Análisis de la foto

1. La foto se reduce en el navegador a un máximo de 1.568 px en su lado
   mayor y se codifica como JPEG. De la misma foto se guarda una miniatura
   de unos 400 px para el historial; la original no se conserva.
2. Se envía a Claude con una instrucción en español que pide identificar
   cada alimento visible, estimar su porción en gramos usando el plato y los
   cubiertos como referencia, y dar calorías, proteína, carbohidratos y
   grasa por alimento.
3. La respuesta sigue este esquema:

```ts
{
  es_comida: boolean,
  alimentos: Array<{
    nombre: string,        // en español
    gramos: number,
    kcal: number,
    proteina_g: number,
    carbos_g: number,
    grasa_g: number,
  }>,
  nota: string,            // dudas o supuestos, p. ej. "asumí aceite de cocción"
}
```

4. La `nota` se muestra en la pantalla de revisión.

Parámetros de la llamada: `claude-opus-5-5`, pensamiento adaptativo, esfuerzo
`low` para que responda rápido, `max_tokens` 16000, sin streaming. Se activan
los fallbacks del servidor en modo `default`. Antes de leer el contenido se
revisa `stop_reason`.

Errores que la interfaz distingue: clave inválida (lleva a Ajustes), límite
de uso o saldo, sin conexión, rechazo o respuesta sin datos. En todos se
puede reintentar o cargar a mano.

## Datos

```ts
Comida   { id, fecha: 'YYYY-MM-DD', hora, tipo, miniatura: Blob | null,
           alimentos: Alimento[], nota }
Alimento { nombre, gramos, kcal, proteina_g, carbos_g, grasa_g }
Dia      { fecha: 'YYYY-MM-DD', metaKcal, metaProteina }
Peso     { fecha: 'YYYY-MM-DD', kg }
Ajustes  { perfil, metaKcal, metaProteina, metaManual: boolean, apiKey }
```

- Las fechas son la fecha local del teléfono.
- Los totales del día se calculan al leer; no se guardan.
- `Dia` guarda la meta vigente: se crea con la meta actual al registrar la
  primera comida de esa fecha. Cambiar la meta actualiza el registro de hoy,
  nunca los de días pasados.
- La exportación es un único archivo JSON con comidas, días, pesos y
  ajustes; las miniaturas van incluidas en base64. La clave de API no se
  exporta.
- Importar reemplaza los datos actuales, con confirmación previa.

## Protección contra pérdida de datos

Los datos viven solo en el teléfono, y en iPhone borrar el icono de la
pantalla de inicio los elimina. Por eso:

- La app pide almacenamiento persistente al navegador
  (`navigator.storage.persist()`).
- Guarda la fecha del último respaldo y, si pasaron más de 7 días con datos
  nuevos, muestra un aviso discreto en Hoy que lleva a exportar.
- Exportar usa la hoja de compartir del sistema (`navigator.share` con
  archivo) para poder guardarlo en Archivos, Drive o enviárselo a uno mismo;
  si no está disponible, descarga el archivo.

## Seguridad de la clave

La clave se guarda solo en el teléfono y solo viaja a la API de Anthropic.
Al vivir en el navegador, quien tenga el teléfono desbloqueado podría
leerla. Para uso personal es aceptable; Ajustes recomienda ponerle un límite
de gasto mensual a la clave en la consola de Anthropic.

## Pruebas

- Unitarias: cálculo de metas (incluido el piso), recálculo proporcional al
  cambiar gramos, totales por día, media móvil del peso, exportar e importar
  ida y vuelta.
- De flujo, con la API simulada: primer uso, foto → revisión → guardar →
  aparece en Hoy, edición y borrado, error de clave inválida.
- La llamada real a Claude se prueba a mano con la clave del usuario; no hay
  clave en el repositorio ni en CI.

## Queda a criterio de quien lo construya

- Estilo visual, colores, tipografía e iconos.
- Librería de gráficas, o SVG propio.
- Estructura de carpetas y componentes.
- Texto exacto de la instrucción a Claude y de los mensajes de la interfaz.
- Detalles del service worker y del workflow de publicación.
