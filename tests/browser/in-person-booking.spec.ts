import { expect, test } from '@playwright/test';

test('crea una ficha presencial y reserva para su mascota sin salir de la agenda', async ({
  page,
}) => {
  await page.addInitScript(() => sessionStorage.setItem('guaupelu-owner-session', 'owner-test'));
  await page.route('**/api/management/session', (route) => route.fulfill({ status: 204 }));
  await page.route('**/api/public/business', (route) =>
    route.fulfill({
      json: {
        contact: null,
        hours: [],
        services: [{ id: 'bath', name: 'Baño', duration: 45, price: 25, species: ['Perro'] }],
      },
    }),
  );
  const client = {
    id: 'onsite',
    name: 'Ana Pérez',
    email: null,
    hasAccount: false,
    phone: '600123456',
  };
  let pets: { id: string; name: string; species: string; weight: number }[] = [];
  await page.route('**/api/management/clients', (route) => {
    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON();
      expect(input).toMatchObject({
        name: client.name,
        phone: client.phone,
        pet: { name: 'Lúa', weight: 12 },
      });
      const pet = { ...input.pet, id: 'lua' };
      pets = [pet];
      return route.fulfill({ status: 201, json: { client, pet } });
    }
    return route.fulfill({ json: pets.length ? [client] : [] });
  });
  await page.route('**/api/management/clients/onsite/pets', (route) => {
    if (route.request().method() === 'POST') {
      const pet = { ...route.request().postDataJSON(), id: 'lola' };
      pets.push(pet);
      return route.fulfill({ status: 201, json: pet });
    }
    return route.fulfill({ json: pets });
  });
  await page.route('**/api/management/appointments/quote?*', (route) =>
    route.fulfill({ json: { price: 25, duration: 45, availableExtras: [] } }),
  );
  await page.route('**/api/management/appointments/availability?*', (route) => {
    const date = new URL(route.request().url()).searchParams.get('date');
    return route.fulfill({ json: [`${date}T11:00:00`] });
  });
  let startsAt = '';
  await page.route('**/api/management/appointments?*', (route) =>
    route.fulfill({
      json: startsAt
        ? [
            {
              id: 'appointment',
              startsAt,
              duration: 45,
              price: 25,
              serviceName: 'Baño',
              petName: 'Lola',
              clientName: 'Ana Pérez',
              status: 'CONFIRMED',
            },
          ]
        : [],
    }),
  );
  await page.route('**/api/management/appointments', (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      clientId: 'onsite',
      petId: 'lola',
      serviceId: 'bath',
    });
    startsAt = route.request().postDataJSON().startsAt;
    return route.fulfill({ status: 201 });
  });
  await page.goto('/gestion');
  await page.getByRole('button', { name: 'Nueva cita' }).click();
  await page.getByRole('button', { name: 'Nueva ficha presencial' }).click();
  await page.getByLabel('Nombre del cliente').fill('Ana Pérez');
  await page.getByLabel('Teléfono de contacto (opcional)').fill('600123456');
  await page.getByLabel('¿Cómo se llama?').fill('Lúa');
  await page.getByLabel('Peso aproximado (kg)').fill('12');
  await page.getByRole('button', { name: 'Guardar ficha y mascota' }).click();
  await expect(page.getByLabel('Cliente', { exact: true })).toHaveValue('onsite');
  await expect(page.getByLabel('Mascota', { exact: true })).toHaveValue('lua');
  await page.getByRole('button', { name: 'Añadir mascota a este cliente' }).click();
  await page.getByLabel('¿Cómo se llama?').fill('Lola');
  await page.getByLabel('Peso aproximado (kg)').fill('8');
  await page.getByRole('button', { name: 'Guardar mascota', exact: true }).click();
  await expect(page.getByLabel('Mascota', { exact: true })).toHaveValue('lola');
  await page.getByLabel('Servicio', { exact: true }).selectOption('bath');
  await page.getByLabel('Hora de Madrid').selectOption({ label: '11:00' });
  await page.getByRole('button', { name: 'Guardar cita' }).click();
  await expect(page.getByRole('button', { name: /Lola, 11:00, 45 min/ })).toBeVisible();
});
