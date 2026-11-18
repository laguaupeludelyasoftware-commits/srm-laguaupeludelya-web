import { expect, test } from '@playwright/test';

test('protege la configuración y actualiza el contacto de la landing', async ({ page }) => {
  let contact = { phone: '746044453', address: 'C/ Dionisio Acedo n.º 6' };
  await page.route('**/api/public/business', (route) =>
    route.fulfill({ json: { contact, services: [] } }),
  );
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ json: { token: 'owner-test' } }),
  );
  await page.route('**/api/management/session', (route) =>
    route.fulfill({
      status: route.request().headers().authorization === 'Bearer owner-test' ? 204 : 403,
    }),
  );
  await page.route('**/api/management/contact', (route) => {
    expect(route.request().headers().authorization).toBe('Bearer owner-test');
    contact = route.request().postDataJSON();
    return route.fulfill({ json: contact });
  });

  await page.goto('/');
  await expect(page.locator('a[href="/gestion"]')).toHaveCount(0);
  await page.goto('/gestion/configuracion');
  await expect(page).toHaveURL(/\/acceso-gestion$/);
  await page.getByLabel('Usuario').fill('nazaret');
  await page.getByLabel('Contraseña').fill('test-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/gestion\/configuracion$/);
  await page.getByLabel('Teléfono').fill('600555444');
  await page.getByRole('button', { name: 'Publicar contacto' }).click();
  await expect(page.getByText('Contacto publicado en la web.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/acceso-gestion$/);
  await page.goto('/gestion');
  await expect(page).toHaveURL(/\/acceso-gestion$/);
  await page.goto('/');
  await expect(page.getByRole('link', { name: '600555444' })).toBeVisible();
});

test('comprueba la confirmación y limpia las contraseñas después de cambiarlas', async ({
  page,
}) => {
  await page.addInitScript(() => sessionStorage.setItem('guaupelu-owner-session', 'owner-test'));
  await page.route('**/api/management/session', (route) => route.fulfill({ status: 204 }));
  let submitted = 0;
  await page.route('**/api/management/password', (route) => {
    submitted++;
    expect(route.request().headers().authorization).toBe('Bearer owner-test');
    expect(route.request().postDataJSON()).toEqual({
      currentPassword: 'previous-password',
      newPassword: 'replacement-password',
      confirmation: 'replacement-password',
    });
    return route.fulfill({ status: 204 });
  });
  await page.goto('/gestion/configuracion');
  await page.getByLabel('Contraseña actual').fill('previous-password');
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('replacement-password');
  await page.getByLabel('Repite la nueva contraseña').fill('different-password');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByText('Las contraseñas nuevas no coinciden.')).toBeVisible();
  expect(submitted).toBe(0);

  await page.getByLabel('Repite la nueva contraseña').fill('replacement-password');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByText('Contraseña actualizada.')).toBeVisible();
  await expect(page.getByLabel('Contraseña actual')).toBeEmpty();
});
