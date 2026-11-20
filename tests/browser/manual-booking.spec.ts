import { expect, test } from '@playwright/test';

test('guarda una cita con un hueco de la API y la recupera al recargar', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('guaupelu-owner-session', 'owner-test'));
  await page.route('**/api/management/session', (route) => route.fulfill({ status: 204 }));
  await page.route('**/api/management/clients', (route) =>
    route.fulfill({ json: [{ id: 'client', name: 'Ana', email: 'ana@example.test' }] }),
  );
  await page.route('**/api/management/clients/client', (route) =>
    route.fulfill({ json: { name: 'Ana', phone: '+34 600 123 456', notes: 'Nota privada' } }),
  );
  await page.route('**/api/management/clients/client/pets', (route) =>
    route.fulfill({
      json: [{ id: 'pet', name: 'Milo', species: 'Perro', weight: 10, coat: 'Corto' }],
    }),
  );
  let ageMonths = 24;
  await page.route('**/api/management/clients/client/pets/pet/details', (route) => {
    if (route.request().method() === 'PUT') ageMonths = route.request().postDataJSON().ageMonths;
    return route.fulfill({ json: { ageMonths, healthNotes: 'Piel sensible' } });
  });
  await page.route('**/api/management/clients/client/pets/pet/history', (route) =>
    route.fulfill({
      json: [
        {
          id: 'past',
          startsAt: '2026-06-12T10:00:00',
          serviceName: 'Baño anterior',
          status: 'ATTENDED',
          duration: 45,
          price: 25,
        },
      ],
    }),
  );
  await page.route('**/api/public/business', (route) =>
    route.fulfill({
      json: {
        hours: [],
        contact: null,
        services: [{ id: 'bath', name: 'Baño', duration: 45, price: 25, species: ['Perro'] }],
      },
    }),
  );
  let startsAt = '';
  await page.route('**/api/management/appointments/availability?*', (route) => {
    const date = new URL(route.request().url()).searchParams.get('date');
    return route.fulfill({ json: [`${date}T10:00:00`] });
  });
  await page.route('**/api/management/appointments**', (route) => {
    const request = route.request();
    if (new URL(request.url()).pathname.endsWith('/availability')) return route.fallback();
    if (request.method() === 'POST') {
      expect(request.headers().authorization).toBe('Bearer owner-test');
      expect(request.postDataJSON()).toMatchObject({
        clientId: 'client',
        petId: 'pet',
        serviceId: 'bath',
      });
      startsAt = request.postDataJSON().startsAt;
      return route.fulfill({ status: 201 });
    }
    return route.fulfill({
      json: startsAt
        ? [
            {
              id: 'appointment',
              startsAt,
              duration: 45,
              price: 25,
              serviceName: 'Baño',
              petName: 'Milo',
              clientName: 'Ana',
              clientId: 'client',
              petId: 'pet',
              clientPhone: '600 123 456',
              status: 'CONFIRMED',
              canRecordAttendance: false,
            },
          ]
        : [],
    });
  });

  await page.goto('/gestion');
  await page.getByRole('button', { name: 'Nueva cita' }).click();
  await page.getByLabel('Cliente', { exact: true }).selectOption('client');
  await page.getByLabel('Mascota', { exact: true }).selectOption('pet');
  await page.getByLabel('Servicio', { exact: true }).selectOption('bath');
  await page.getByLabel('Hora de Madrid').selectOption({ label: '10:00' });
  await page.getByRole('button', { name: 'Guardar cita' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const appointment = page.getByRole('button', { name: /Milo, 10:00, 45 min/ });
  await expect(appointment).toBeVisible();
  await page.reload();
  await appointment.click();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Ana' })).toHaveAttribute(
    'href',
    '/gestion/clientes?cliente=client',
  );
  await page.getByRole('button', { name: 'Preparar recordatorio' }).click();
  const reminder = await page
    .getByRole('link', { name: 'Revisar y enviar en WhatsApp' })
    .getAttribute('href');
  expect(reminder).toContain('https://wa.me/34600123456?text=');
  expect(decodeURIComponent(reminder ?? '')).toContain('la cita de Milo para Baño');
  expect(decodeURIComponent(reminder ?? '')).toContain('10:00 (hora de Madrid)');
  await page.getByRole('dialog').getByRole('link', { name: 'Ficha de Milo' }).click();
  await expect(page.getByText('Baño anterior')).toBeVisible();
  await page.getByLabel('Edad aproximada (meses)').fill('36');
  await page.getByRole('button', { name: 'Guardar ficha' }).click();
  await expect(page.getByText('Ficha guardada.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Edad aproximada (meses)')).toHaveValue('36');
  await page.getByRole('link', { name: 'Volver a la ficha de Ana' }).click();
  await expect(page.getByRole('link', { name: 'Abrir WhatsApp' })).toHaveAttribute(
    'href',
    'https://wa.me/34600123456',
  );
});
