import { defineConfig } from '@playwright/test';

/** Matriz de tamaños con WebKit para aproximar iOS; no sustituye pruebas en un iPad físico. */
export default defineConfig({
  testDir: './tests/browser',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'movil-estrecho',
      use: {
        browserName: 'webkit',
        viewport: { width: 320, height: 740 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'iphone',
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'movil-horizontal',
      use: {
        browserName: 'webkit',
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'ipad',
      use: {
        browserName: 'webkit',
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'ipad-air',
      use: {
        browserName: 'webkit',
        viewport: { width: 834, height: 1194 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'ipad-horizontal',
      use: {
        browserName: 'webkit',
        viewport: { width: 1194, height: 834 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'escritorio',
      use: {
        browserName: 'chromium',
        channel: process.platform === 'win32' ? 'msedge' : undefined,
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
});
