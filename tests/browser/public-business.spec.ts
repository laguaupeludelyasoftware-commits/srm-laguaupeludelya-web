import { expect, test } from '@playwright/test';

test('pide una cuenta para reservar y conserva el servicio elegido al registrarse', async ({
  page,
}) => {
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
  await expect(page.getByRole('link', { name: 'Preguntar por WhatsApp' })).toHaveAttribute(
    'href',
    'https://wa.me/34746044453',
  );
  await page.getByRole('link', { name: 'Reservar Baño publicado' }).click();
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  await expect(page.getByText('Clara', { exact: true })).toHaveCount(0);
  await page.route('**/api/auth/register', (route) =>
    route.fulfill({ json: { token: 'booking-test' } }),
  );
  await page.route('**/api/auth/client/me', (route) =>
    route.fulfill({
      json: { name: 'Clara Prueba', email: 'clara@example.com', emailVerified: false },
    }),
  );
  const pet = { id: 'milo', name: 'Milo', species: 'Perro', weight: 6 };
  let hasPet = false;
  await page.route('**/api/auth/client/pets', (route) => {
    if (route.request().method() === 'POST') {
      hasPet = true;
      return route.fulfill({ status: 201, json: pet });
    }
    return route.fulfill({ json: hasPet ? [pet] : [] });
  });
  await page.route('**/api/auth/client/appointments/quote?*', (route) =>
    route.fulfill({ json: { price: 24.5, duration: 45, availableExtras: [] } }),
  );
  await page.route('**/api/auth/client/appointments', (route) => route.fulfill({ json: [] }));
  await page.getByRole('link', { name: 'Crear una cuenta' }).click();
  await page.getByLabel('Tu nombre').fill('Clara Prueba');
  await page.getByLabel('Correo electrónico').fill('clara@example.com');
  await page.getByLabel('Contraseña').fill('client-test-password');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL(/\/reservar\?servicio=bano-publicado$/);
  await page.getByLabel('¿Cómo se llama?').fill('Milo');
  await page.getByLabel('Peso aproximado (kg)').fill('6');
  await page.getByRole('button', { name: 'Guardar mascota y continuar' }).click();
  await expect(page.getByLabel('Servicio')).toHaveValue('bano-publicado');
  await expect(page.getByRole('button', { name: 'Confirmar cita' })).toBeDisabled();
});

test('protege el acceso directo al asistente de demostración', async ({ page }) => {
  await page.goto('/gestion/demo/reservar');
  await expect(page).toHaveURL(/\/acceso-gestion$/);
  await page.goto('/demo/mi-espacio');
  await expect(page.getByText('La página que buscas no existe.')).toBeVisible();
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
