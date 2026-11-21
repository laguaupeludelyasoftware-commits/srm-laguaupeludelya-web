import { expect, test } from '@playwright/test';

test('crea un extra de catálogo y lo asigna al crear un servicio', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('guaupelu-owner-session', 'owner-test'));
  await page.route('**/api/management/session', (route) => route.fulfill({ status: 204 }));
  const extra = { id: 'brush', name: 'Cepillado', price: 5, duration: 15, active: true };
  const inactiveExtra = { id: 'balm', name: 'Bálsamo', price: 4, duration: 5, active: false };
  let savedExtra = false;
  await page.route('**/api/management/extras', (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({
        name: extra.name,
        price: extra.price,
        duration: extra.duration,
        active: extra.active,
      });
      savedExtra = true;
      return route.fulfill({ status: 201, json: extra });
    }
    return route.fulfill({ json: savedExtra ? [extra, inactiveExtra] : [] });
  });
  const service = {
    name: 'Baño de prueba',
    description: '',
    price: 25,
    duration: 45,
    species: ['Perro'],
    active: false,
    extraIds: [extra.id],
  };
  let savedService = false;
  await page.route('**/api/management/services', (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual(service);
      savedService = true;
      return route.fulfill({ status: 201, json: { id: 'bath', ...service } });
    }
    return route.fulfill({ json: savedService ? [{ id: 'bath', ...service }] : [] });
  });

  await page.goto('/gestion/servicios');
  await expect(page.getByText(/Crea primero los extras/)).toBeVisible();
  const newService = page.getByRole('button', { name: 'Nuevo servicio' });
  const newExtra = page.getByRole('button', { name: 'Nuevo extra' });
  await expect(newService).toBeVisible();
  await expect(newExtra).toHaveCount(0);
  await page.getByRole('button', { name: 'Gestionar extras' }).click();
  await expect(page.getByRole('heading', { name: 'Catálogo de extras' })).toBeVisible();
  await newExtra.click();
  await expect(page.getByRole('heading', { name: 'Nuevo extra' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(newService).toHaveCount(0);
  await page.getByLabel('Nombre del extra').fill(extra.name);
  await page.getByLabel('Precio adicional').fill(String(extra.price));
  await page.getByLabel('Minutos adicionales').fill(String(extra.duration));
  await page.getByLabel('Publicar extra').check();
  await page.getByRole('button', { name: 'Guardar extra' }).click();
  await expect(page.getByText(extra.name, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Catálogo de extras' })).toBeVisible();
  const extraAction = await newExtra.boundingBox();
  const firstRow = await page.locator('.catalog-option-row').first().boundingBox();
  if (!extraAction || !firstRow) throw new Error('Falta la acción o el listado de extras.');
  expect(extraAction.y + extraAction.height).toBeLessThan(firstRow.y);
  for (const [name, status] of [
    [extra.name, 'Publicado'],
    [inactiveExtra.name, 'Sin publicar'],
  ]) {
    const row = page.locator('.catalog-option-row').filter({ hasText: name });
    await expect(row.getByRole('button', { name: 'Editar' })).toBeVisible();
    await expect(row.getByText(status, { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Volver a servicios' }).click();

  await page.getByRole('button', { name: 'Nuevo servicio' }).click();
  await expect(page.getByRole('heading', { name: 'Nuevo servicio' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Nombre del servicio').fill(service.name);
  await page.getByLabel('Precio base').fill(String(service.price));
  await page.getByLabel('Duración (minutos)').fill(String(service.duration));
  const picker = page.getByRole('combobox', { name: 'Añadir extra' });
  const selected = page.getByRole('list', { name: 'Extras añadidos' });
  await picker.click();
  await page.getByRole('option', { name: /Cepillado/ }).click();
  await picker.click();
  await expect(page.getByRole('option', { name: /Cepillado/ })).toHaveCount(0);
  await page.getByRole('option', { name: /Bálsamo.*Sin publicar/ }).click();
  await expect(selected.getByRole('listitem')).toHaveCount(2);
  await selected.getByRole('button', { name: 'Quitar Bálsamo' }).click();
  await page.getByRole('button', { name: 'Guardar servicio' }).click();
  await expect(page.getByText('Servicio guardado.')).toBeVisible();

  await page.getByRole('button', { name: 'Editar servicio' }).click();
  await expect(selected.getByRole('listitem')).toHaveCount(1);
  await expect(selected.getByText(extra.name, { exact: true })).toBeVisible();
});

test('mantiene las tarjetas de servicios a la misma altura con textos largos', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('guaupelu-owner-session', 'owner-test'));
  await page.route('**/api/management/session', (route) => route.fulfill({ status: 204 }));
  const service = {
    name: 'Baño',
    description: 'Baño y secado.',
    price: 25,
    duration: 45,
    species: ['Perro'],
    active: true,
  };
  const longName = 'Baño completo con cepillado, secado y arreglo del manto';
  await page.route('**/api/management/services', (route) =>
    route.fulfill({
      json: [
        { ...service, id: 'bath' },
        { ...service, id: 'cut', name: 'Corte' },
        { ...service, id: 'dry', name: 'Secado', description: '' },
        {
          ...service,
          id: 'full',
          name: longName,
          description: 'Servicio de peluquería con cuidado adaptado al manto. '.repeat(8),
          species: ['Perro', 'Gato'],
        },
      ],
    }),
  );
  await page.goto('/gestion/servicios');
  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(4);
  const heights = await cards.evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().height),
  );
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);
  const title = page.getByRole('heading', { name: longName });
  await expect(title).toHaveAttribute('title', longName);
  expect(await title.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
});

test('carga un ejemplo editable de ajuste por mascota y lo guarda desactivado', async ({
  page,
}) => {
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
  await page.getByRole('button', { name: 'Ajustes por mascota' }).click();
  await expect(page.getByText(/Cambia automáticamente el precio o la duración/)).toBeVisible();
  await page.getByRole('button', { name: 'Cargar ejemplo' }).click();
  const coat = page.getByRole('combobox', { name: 'Tipo de manto' });
  await coat.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(page.getByRole('option', { name: 'Largo', exact: true })).toHaveAttribute(
    'data-state',
    'checked',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(coat).toBeFocused();
  await expect(page.getByLabel('Publicar ajuste')).not.toBeChecked();
  expect(saved).toBeUndefined();
  await page.getByLabel('Nombre del ajuste').fill('Tramo largo');
  await page.getByRole('button', { name: 'Guardar ajuste' }).click();
  await expect(page.getByText('Tramo largo')).toBeVisible();
  await expect(page.getByText(/Prioridad 10 · Desactivado/)).toBeVisible();
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
  const choose = async (field: string, option: string) => {
    await page.getByRole('combobox', { name: field, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  };
  await choose('Cliente', 'Ana · ana@example.test');
  await choose('Mascota', 'Milo');
  await choose('Servicio', 'Baño · 45 min');
  await expect(page.getByText('Variante aplicada: Manto corto')).toBeVisible();
  await page.getByLabel(/Cepillado extra/).check();
  await choose('Hora de Madrid', '10:00');
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
  await choose('Nueva hora de Madrid', '11:00');
  await page.getByRole('button', { name: 'Confirmar cambio' }).click();
  await expect(page.getByText(/No se pudo reprogramar/)).toBeVisible();
  await expect(page.getByRole('dialog').getByText(/· 10:00$/)).toBeVisible();
  await choose('Nueva hora de Madrid', '11:00');
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
