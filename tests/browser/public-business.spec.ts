import { expect, test } from '@playwright/test';

test('mantiene el separador de la landing en una sola línea al cambiar el ancho', async ({
  page,
}) => {
  await page.route('**/api/public/business', (route) =>
    route.fulfill({ json: { contact: null, services: [] } }),
  );
  await page.goto('/');
  await expect(page.locator('.hero a')).toHaveCount(0);
  await expect(page.getByText('Para los que son mucho más que una mascota.')).toHaveCount(0);
  const line = page.locator('.care-ribbon-line');
  await page.evaluate(() => document.fonts.ready);

  async function visiblePhrases() {
    return line.evaluate((element) => {
      const { top, bottom } = element.getBoundingClientRect();
      return Array.from(element.children).filter((item) => {
        const bounds = item.getBoundingClientRect();
        return bounds.top >= top && bounds.bottom <= bottom;
      }).length;
    });
  }

  await page.setViewportSize({ width: 320, height: 740 });
  expect(await visiblePhrases()).toBe(2);
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await visiblePhrases()).toBe(4);
});

test('pide una cuenta para reservar y conserva el servicio elegido al registrarse', async ({
  page,
}) => {
  await page.route('https://www.google.com/maps?**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Mapa</title>' }),
  );
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
  await expect(page.getByText('746044453', { exact: true })).toHaveCount(0);
  await expect(page.getByText('C/ Dionisio Acedo n.º 6', { exact: true })).toHaveCount(0);
  const whatsapp = page.getByRole('link', { name: 'Preguntar por WhatsApp' });
  const actions = page.locator('.hours-contact-actions');
  const map = page.getByTitle('Mapa de La Guaupelu de Lya');
  await expect(map).toHaveAttribute('src', /output=embed/);
  await expect(map).toHaveAttribute('src', /[?&]z=18(?:&|$)/);
  await expect(page.getByRole('link', { name: 'Abrir indicaciones' })).toHaveAttribute(
    'href',
    /destination=.*Dionisio\+Acedo/,
  );
  await expect(page.getByRole('link', { name: 'Llamar al local' })).toHaveAttribute(
    'href',
    'tel:+34746044453',
  );
  await expect(whatsapp).toHaveAttribute('href', 'https://wa.me/34746044453');
  await expect(actions).toHaveAttribute('data-docked', 'false');
  await page.locator('.hours-contact-slot').evaluate((slot) => {
    slot.scrollIntoView({ block: 'center' });
  });
  await expect(actions).toHaveAttribute('data-docked', 'true');
  const hoursCard = await page.locator('.published-hours').boundingBox();
  const mapCard = await page.getByRole('region', { name: 'Cómo llegar' }).boundingBox();
  expect(mapCard?.width).toBeCloseTo(hoursCard?.width ?? 0, 0);
  expect(mapCard?.height).toBeCloseTo(hoursCard?.height ?? 0, 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(actions).toHaveAttribute('data-docked', 'false');
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

test('muestra tres servicios y adelanta el resto hasta que se amplía el catálogo', async ({
  page,
}) => {
  const services = Array.from({ length: 7 }, (_, index) => ({
    id: `servicio-${index + 1}`,
    name: `Servicio ${index + 1}`,
    description: 'Lavado y secado',
    price: 25,
    duration: 45,
    species: ['Perro'],
  }));
  await page.route('**/api/public/business', (route) =>
    route.fulfill({ json: { contact: null, services } }),
  );
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Mostrar más servicios' });
  const section = page.locator('#servicios');
  const preview = page.locator('#servicios-adicionales');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(section.getByRole('article')).toHaveCount(3);
  const mobile = await page.evaluate(() => matchMedia('(max-width: 580px)').matches);
  await expect(preview.locator('article:visible')).toHaveCount(mobile ? 1 : 3);
  const previewRatio = await preview.evaluate(
    (element) =>
      element.getBoundingClientRect().height /
      element.querySelector('article')!.getBoundingClientRect().height,
  );
  expect(previewRatio).toBeCloseTo(0.5, 1);

  await toggle.click();
  const collapse = page.getByRole('button', { name: 'Mostrar menos' });
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await expect(section.getByRole('article')).toHaveCount(7);
  await expect(section.getByRole('link', { name: 'Reservar Servicio 7' })).toHaveAttribute(
    'href',
    '/reservar?servicio=servicio-7',
  );
  await collapse.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(section.getByRole('article')).toHaveCount(3);
});
