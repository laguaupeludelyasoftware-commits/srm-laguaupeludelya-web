import { expect, test } from '@playwright/test';

test('muestra el contacto publicado y preselecciona un servicio del backend', async ({ page }) => {
  await page.route('**/api/public/business', (route) =>
    route.fulfill({
      json: {
        contact: { phone: '746044453', address: 'C/ Dionisio Acedo n.º 6' },
        services: [
          {
            id: 'bano-publicado',
            name: 'Baño publicado',
            description: 'Lavado y secado',
            price: 24.5,
            duration: 45,
            species: ['Perro'],
          },
        ],
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('link', { name: '746044453' })).toHaveAttribute(
    'href',
    'tel:746044453',
  );
  await expect(page.getByText('C/ Dionisio Acedo n.º 6')).toBeVisible();
  await page.getByRole('link', { name: 'Reservar Baño publicado' }).click();
  await expect(page.getByRole('button', { name: /Baño publicado/ })).toHaveClass(/selected/);
});

test('distingue un catálogo vacío de una API no disponible', async ({ page }) => {
  await page.route('**/api/public/business', (route) =>
    route.fulfill({ json: { contact: null, services: [] } }),
  );
  await page.goto('/');
  await expect(page.getByText('Aún no hay servicios publicados.')).toBeVisible();
  await page.unroute('**/api/public/business');
  await page.route('**/api/public/business', (route) => route.fulfill({ status: 503 }));
  await page.reload();
  await expect(page.getByText('No se pudieron cargar los servicios.')).toBeVisible();
  await expect(page.getByText('Aún no hay servicios publicados.')).toHaveCount(0);
});
