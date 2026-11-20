import { expect, test } from '@playwright/test';

test('cierra una visita, corrige el tratamiento y lo consulta en la ficha', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-20T11:00:00Z'));
  await page.addInitScript(() => sessionStorage.setItem('guaupelu-owner-session', 'owner-test'));
  await page.route('**/api/management/session', (route) => route.fulfill({ status: 204 }));
  await page.route('**/api/public/business', (route) =>
    route.fulfill({ json: { contact: null, services: [], hours: [] } }),
  );
  const visit = {
    id: 'visit',
    startsAt: '2026-11-20T09:00:00',
    duration: 45,
    price: 25,
    serviceName: 'Baño',
    petName: 'Milo',
    clientName: 'Ana',
    clientId: 'client',
    petId: 'pet',
    status: 'CONFIRMED',
    canRecordAttendance: true,
    treatment: null as null | { performed: string; changes: string; followUp: string },
  };
  await page.route('**/api/management/appointments?*', (route) => route.fulfill({ json: [visit] }));
  await page.route('**/api/management/appointments/visit/attendance', (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ attended: true, validate: false });
    visit.treatment = route.request().postDataJSON().treatment;
    visit.status = 'ATTENDED';
    visit.canRecordAttendance = false;
    return route.fulfill({ status: 204 });
  });
  await page.route('**/api/management/appointments/visit/treatment', (route) => {
    expect(route.request().method()).toBe('PUT');
    visit.treatment = route.request().postDataJSON();
    return route.fulfill({ status: 204 });
  });
  await page.route('**/api/management/clients', (route) =>
    route.fulfill({ json: [{ id: 'client', name: 'Ana', email: 'ana@example.test' }] }),
  );
  await page.route('**/api/management/clients/client/pets', (route) =>
    route.fulfill({
      json: [{ id: 'pet', name: 'Milo', species: 'Perro', weight: 10, coat: 'Corto' }],
    }),
  );
  await page.route('**/api/management/clients/client/pets/pet/details', (route) =>
    route.fulfill({ json: { ageMonths: null, healthNotes: '' } }),
  );
  await page.route('**/api/management/clients/client/pets/pet/history', (route) =>
    route.fulfill({ json: [visit] }),
  );

  await page.goto('/gestion');
  await page.getByRole('button', { name: /Milo, 09:00, 45 min/ }).click();
  await page.getByRole('button', { name: 'Registrar asistencia' }).click();
  await page.getByLabel('Trabajo realizado').fill('Baño y cepillado');
  await page.getByLabel('Cambios respecto a la reserva (opcional)').fill('Acabado a tijera');
  await page.getByLabel('Para la próxima visita (opcional)').fill('Revisar el manto');
  await page.getByRole('button', { name: 'Confirmar asistencia' }).click();
  await expect(page.getByText('Baño y cepillado')).toBeVisible();
  await page.getByRole('button', { name: 'Editar tratamiento' }).click();
  await page.getByLabel('Para la próxima visita (opcional)').fill('Traer su cepillo');
  await page.getByRole('button', { name: 'Guardar tratamiento' }).click();
  await expect(page.getByText('Traer su cepillo')).toBeVisible();
  await page.getByRole('link', { name: 'Ficha de Milo' }).click();
  await expect(page.getByRole('heading', { name: 'Historial de citas' })).toBeVisible();
  await expect(page.getByText('Traer su cepillo')).toBeVisible();
  await expect(page.getByText('Baño y cepillado')).toBeVisible();
});
