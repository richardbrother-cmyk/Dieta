# Dieta

App personal para llevar la cuenta de lo que comes. Le tomas una foto al plato, la app
reconoce los alimentos y sus porciones, estima calorías y macros, y lo anota en el
registro del día frente a tu meta.

- **Hoy**: calorías y proteína del día contra tu meta, y las comidas registradas.
- **Foto del plato**: estimación por alimento, que puedes corregir antes de guardar.
- **Agregar a mano**: describes lo que comiste con palabras y se estima igual.
- **Historial**: cada día con su total y si cumplió la meta que tenías ese día.
- **Peso**: registro diario con gráfica y media de los últimos 7 registros.

Los datos se guardan solo en tu teléfono. No hay cuentas ni servidor.

Las calorías y las metas son estimaciones orientativas; no reemplazan el consejo de un
profesional de salud.

## Lo que necesitas

Una clave de la API de Claude. El análisis de cada foto cuesta unos centavos de dólar.

1. Entra a [console.anthropic.com](https://console.anthropic.com) y crea una clave de API.
2. En la consola, ponle un límite de gasto mensual.
3. Pégala en la app, en **Ajustes → Clave de Claude**, y toca **Probar clave**.

La clave se guarda solo en el teléfono y solo se envía a Anthropic. No se incluye en los
respaldos.

## Publicarla

El repositorio trae un workflow que publica la app en GitHub Pages con cada cambio en `main`.

1. En GitHub: **Settings → Pages → Source: GitHub Actions**.
2. Lleva los cambios a `main`.
3. La app queda en `https://<tu-usuario>.github.io/Dieta/`.

La dirección es pública, pero el sitio no contiene tus datos ni tu clave.

## Instalarla en Android

1. Abre la dirección en Chrome.
2. Menú **⋮ → Agregar a pantalla principal** (o **Instalar app**).
3. Ábrela desde el icono. El registro funciona sin conexión; analizar una foto necesita internet.

## Respaldo

Los datos viven en un solo teléfono. En **Ajustes → Respaldo**, **Exportar respaldo** crea
un archivo que puedes guardar en Drive o enviarte. **Importar respaldo** reemplaza todo lo
que hay por el contenido del archivo. La app avisa cuando llevas más de 7 días sin exportar.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm test         # pruebas unitarias y de pantallas
npm run e2e      # flujo completo en un navegador, con la API simulada
npm run build    # sitio estático en dist/
```

El código está en `src/`: `dominio` (cálculos), `datos` (guardado y respaldo), `ia`
(llamada a Claude), `pantallas` y `componentes`. El diseño está en
`docs/superpowers/specs/`.
