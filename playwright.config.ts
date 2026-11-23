import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4173/Dieta/',
    // Las pruebas simulan la API de Anthropic; un service worker podría saltarse esa simulación.
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/Dieta/',
    reuseExistingServer: !process.env.CI,
  },
});
