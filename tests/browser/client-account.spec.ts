import { expect, test } from '@playwright/test';

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
