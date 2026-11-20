import { expect, test } from '@playwright/test';

test('carga un ejemplo editable de variante y lo guarda desactivado', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('guaupelu-owner-session', 'owner-test'));
  await page.route('**/api/management/session', (route) => route.fulfill({ status: 204 }));
  await page.route('**/api/management/services', (route) =>
    route.fulfill({
      json: [
        {
          id: 'bath',
          name: 'Baño',
          description: '',
          price: 25,
          duration: 45,
          species: ['Perro'],
          active: true,
        },
      ],
    }),
  );
  let saved: object | undefined;
  await page.route('**/api/management/services/bath/variants', (route) => {
    if (route.request().method() === 'POST') {
      saved = route.request().postDataJSON();
      expect(saved).toMatchObject({
        minWeight: 10,
        maxWeight: 25,
        price: 30,
        priceMax: 38,
        active: false,
      });
      return route.fulfill({ status: 201 });
    }
    return route.fulfill({ json: saved ? [{ id: 'variant', rule: saved }] : [] });
  });
  await page.goto('/gestion/servicios');
  await page.getByRole('button', { name: 'Gestionar variantes' }).click();
  await page.getByRole('button', { name: 'Cargar ejemplo' }).click();
  await expect(page.getByLabel('Publicar variante')).not.toBeChecked();
  expect(saved).toBeUndefined();
  await page.getByLabel('Nombre de la variante').fill('Tramo largo');
  await page.getByRole('button', { name: 'Guardar variante' }).click();
  await expect(page.getByText('Tramo largo')).toBeVisible();
  await expect(page.getByText(/Prioridad 10 · Desactivada/)).toBeVisible();
});

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
  let rescheduleAttempts = 0;
  await page.route('**/api/management/appointments/availability?*', (route) => {
    const date = new URL(route.request().url()).searchParams.get('date');
    return route.fulfill({ json: [`${date}T10:00:00`] });
  });
  await page.route('**/api/management/appointments/quote?*', (route) => {
    const extra = { id: 'extra', name: 'Cepillado extra', price: 7.5, duration: 15, active: true };
    const selected = new URL(route.request().url()).searchParams.has('extraIds');
    return route.fulfill({
      json: {
        price: selected ? 32.5 : 25,
        priceMax: selected ? 40 : 32.5,
        variantName: 'Manto corto',
        duration: selected ? 60 : 45,
        availableExtras: [extra],
      },
    });
  });
  await page.route('**/api/management/appointments**', (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/reschedule/availability')) {
      const date = new URL(request.url()).searchParams.get('date');
      return route.fulfill({ json: [`${date}T11:00:00`] });
    }
    if (pathname.endsWith('/reschedule') && request.method() === 'PUT') {
      expect(request.postDataJSON()).toEqual({
        expectedStart: startsAt,
        startsAt: `${startsAt.slice(0, 10)}T11:00:00`,
      });
      if (++rescheduleAttempts === 1) return route.fulfill({ status: 409 });
      startsAt = request.postDataJSON().startsAt;
      return route.fulfill({ status: 204 });
    }
    if (/\/(availability|quote)$/.test(new URL(request.url()).pathname)) return route.fallback();
    if (request.method() === 'POST') {
      expect(request.headers().authorization).toBe('Bearer owner-test');
      expect(request.postDataJSON()).toMatchObject({
        clientId: 'client',
        petId: 'pet',
        serviceId: 'bath',
        extraIds: ['extra'],
        expectedPrice: 32.5,
        expectedDuration: 60,
        expectedPriceMax: 40,
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
              duration: 60,
              price: 32.5,
              serviceName: 'Baño',
              petName: 'Milo',
              clientName: 'Ana',
              clientId: 'client',
              petId: 'pet',
              clientPhone: '600 123 456',
              extraNames: ['Cepillado extra'],
              variantName: 'Manto corto',
              priceMax: 40,
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
  await expect(page.getByText('Variante aplicada: Manto corto')).toBeVisible();
  await page.getByLabel(/Cepillado extra/).check();
  await page.getByLabel('Hora de Madrid').selectOption({ label: '10:00' });
  await page.getByRole('button', { name: 'Guardar cita' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const appointment = page.getByRole('button', { name: /Milo, 10:00, 60 min/ });
  await expect(appointment).toBeVisible();
  await page.reload();
  await appointment.click();
  await expect(page.getByRole('dialog').getByText('Extras: Cepillado extra')).toBeVisible();
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
  await page.getByRole('button', { name: 'Cambiar fecha u hora' }).click();
  await page.getByLabel('Nueva hora de Madrid').selectOption({ label: '11:00' });
  await page.getByRole('button', { name: 'Confirmar cambio' }).click();
  await expect(page.getByText(/No se pudo reprogramar/)).toBeVisible();
  await expect(page.getByRole('dialog').getByText(/· 10:00$/)).toBeVisible();
  await page.getByLabel('Nueva hora de Madrid').selectOption({ label: '11:00' });
  await page.getByRole('button', { name: 'Confirmar cambio' }).click();
  await expect(page.getByText('Cita reprogramada.')).toBeVisible();
  await expect(appointment).toHaveCount(0);
  await page.getByRole('button', { name: /Milo, 11:00, 60 min/ }).click();
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
