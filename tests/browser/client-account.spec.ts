import { expect, test } from '@playwright/test';

test('reserva con el correo pendiente y recupera la cita al recargar', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('guaupelu-client-session', 'client-test'));
  await page.route('**/api/auth/client/me', (route) =>
    route.fulfill({
      json: { name: 'Clara', email: 'clara@example.test', emailVerified: false },
    }),
  );
  await page.route('**/api/auth/client/pets', (route) =>
    route.fulfill({ json: [{ id: 'pet', name: 'Milo', species: 'Perro' }] }),
  );
  await page.route('**/api/public/business', (route) =>
    route.fulfill({
      json: {
        contact: null,
        services: [{ id: 'bath', name: 'Baño', species: ['Perro'], price: 25, duration: 45 }],
      },
    }),
  );
  const startsAt = '2027-01-12T10:00:00';
  let booked = false;
  await page.route('**/api/auth/client/appointments/availability?*', (route) =>
    route.fulfill(booked ? { status: 409 } : { json: [startsAt] }),
  );
  await page.route('**/api/auth/client/appointments', (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().headers().authorization).toBe('Bearer client-test');
      expect(route.request().postDataJSON()).toEqual({ petId: 'pet', serviceId: 'bath', startsAt });
      booked = true;
      return route.fulfill({ status: 201 });
    }
    return route.fulfill({
      json: booked
        ? [
            {
              id: 'appointment',
              startsAt,
              duration: 45,
              price: 25,
              serviceName: 'Baño',
              petName: 'Milo',
              status: 'CONFIRMED',
              canCancel: true,
              cancellationHours: 8,
            },
          ]
        : [],
    });
  });
  await page.goto('/reservar?servicio=bath');
  await expect(page.getByLabel('Servicio')).toHaveValue('bath');
  await page.getByLabel('Mascota').selectOption('pet');
  await page.getByLabel('Fecha').fill('2027-01-12');
  await page.getByLabel('Hora de Madrid').selectOption(startsAt);
  await page.getByRole('button', { name: 'Confirmar cita' }).click();
  await expect(page.getByText('Cita confirmada.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Milo · Baño' })).toBeVisible();
});

test('registra, cierra sesión y vuelve a entrar sin verificar el correo', async ({ page }) => {
  await page.route('**/api/auth/client/pets', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/auth/register', (route) => {
    expect(route.request().postDataJSON()).toEqual({
      name: 'Clara Prueba',
      email: 'clara@example.com',
      password: 'client-test-password',
    });
    return route.fulfill({ json: { token: 'client-test' } });
  });
  await page.route('**/api/auth/client/login', (route) =>
    route.fulfill({ json: { token: 'client-test' } }),
  );
  await page.route('**/api/auth/client/me', (route) => {
    expect(route.request().headers().authorization).toBe('Bearer client-test');
    return route.fulfill({
      json: { name: 'Clara Prueba', email: 'clara@example.com', emailVerified: false },
    });
  });
  await page.goto('/registro');
  await page.getByLabel('Tu nombre').fill('Clara Prueba');
  await page.getByLabel('Correo electrónico').fill('clara@example.com');
  await page.getByLabel('Contraseña').fill('client-test-password');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Clara Prueba' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
  await expect(page.getByText('Correo electrónico: clara@example.com')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mis mascotas' })).toBeVisible();
  await expect(page.getByText('Verificación de correo pendiente.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  await page.getByLabel('Correo electrónico').fill('clara@example.com');
  await page.getByLabel('Contraseña').fill('client-test-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Clara Prueba' })).toBeVisible();
});
