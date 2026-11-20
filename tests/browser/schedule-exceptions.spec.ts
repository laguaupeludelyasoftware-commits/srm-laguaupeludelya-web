import { expect, test } from '@playwright/test';

test('bloquea unas horas y muestra las citas que impiden cerrar el día', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('guaupelu-owner-session', 'owner-test'));
  await page.route('**/api/management/session', (route) => route.fulfill({ status: 204 }));
  await page.route('**/api/public/business', (route) =>
    route.fulfill({ json: { contact: null, services: [], hours: [] } }),
  );
  await page.route('**/api/management/appointments/policy', (route) =>
    route.fulfill({ json: { cancellationHours: 8 } }),
  );
  await page.route('**/api/management/whatsapp-reminders', (route) =>
    route.fulfill({
      json: { enabled: false, providerEnabled: false, leadHours: 24, attempts: [] },
    }),
  );
  let saved: { date: string; intervals: { start: string; end: string }[] } | undefined;
  await page.route('**/api/management/hours/exceptions', (route) =>
    route.fulfill({ json: saved ? [saved] : [] }),
  );
  await page.route('**/api/management/hours/exceptions/*', (route) => {
    const date = new URL(route.request().url()).pathname.split('/').at(-1)!;
    if (route.request().method() === 'PUT') {
      const intervals = route.request().postDataJSON();
      if (!intervals.length) {
        return route.fulfill({
          status: 409,
          json: {
            appointments: [
              {
                id: 'appointment',
                startsAt: `${date}T10:00:00`,
                endsAt: `${date}T11:00:00`,
                petName: 'Milo',
                serviceName: 'Baño',
              },
            ],
          },
        });
      }
      expect(intervals).toEqual([
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '18:00' },
      ]);
      saved = { date, intervals };
    }
    return route.fulfill({
      json: {
        date,
        exceptional: !!saved,
        intervals: saved?.intervals ?? [{ start: '09:00', end: '18:00' }],
      },
    });
  });

  await page.goto('/gestion/configuracion');
  await page.getByLabel('Inicio del bloqueo').fill('12:00');
  await page.getByLabel('Fin del bloqueo').fill('14:00');
  await page.getByRole('button', { name: 'Aplicar bloqueo' }).click();
  await page.getByRole('button', { name: 'Guardar excepción' }).click();
  await expect(page.getByText('Excepción guardada.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Apertura del tramo 2')).toHaveValue('14:00');
  await page.getByRole('button', { name: 'Cerrar todo el día' }).click();
  await page.getByRole('button', { name: 'Guardar excepción' }).click();
  await expect(page.getByText('10:00–11:00 · Milo · Baño')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Apertura del tramo 2')).toHaveValue('14:00');
});
