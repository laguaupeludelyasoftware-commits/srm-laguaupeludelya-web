import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Comprueba el documento, permitiendo scroll horizontal solo dentro de agenda o tabla. */
async function expectNoPageOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport + 1);
}

test('pantallas principales sin errores ni desbordamiento de página', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of [
    '/',
    '/registro',
    '/mi-espacio',
    '/reservar',
    '/gestion',
    '/gestion/clientes',
    '/gestion/servicios',
    '/gestion/configuracion',
  ]) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expectNoPageOverflow(page);
    if (path === '/' || path === '/gestion') {
      await page.screenshot({
        path: testInfo.outputPath(path === '/' ? 'landing.png' : 'agenda.png'),
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
  expect(errors).toEqual([]);
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Abrir menú' });
  if (await menu.isVisible()) {
    await menu.click();
    await page.getByRole('link', { name: 'Mi espacio', exact: true }).click();
    await expect(page).toHaveURL(/mi-espacio/);
    await expect(page.locator('h1')).toBeVisible();
  }
});

test('reserva completa y cancelación desde el área cliente', async ({ page }) => {
  await page.goto('/reservar');
  await page.getByRole('button', { name: /Baño y mimos/ }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('Encontramos su huequito')).toBeVisible();
  // Elige un lunes futuro para no depender del día semanal en que se ejecute la prueba.
  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));
  const date = `${nextMonday.getFullYear()}-${String(nextMonday.getMonth() + 1).padStart(2, '0')}-${String(nextMonday.getDate()).padStart(2, '0')}`;
  await page.getByLabel('Día de la visita').fill(date);
  await page.locator('.time-slot').first().click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar reserva de ejemplo' }).click();
  await expect(page.getByRole('heading', { name: '¡Un mimo en camino!' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver mis citas' }).click();
  await expect(page.getByText('Nala · Baño y mimos')).toBeVisible();
  await page.getByRole('button', { name: /No podemos asistir/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: 'Sí, cancelar cita' }).click();
  await expect(page.locator('.badge-cancelled')).toBeVisible();
});

test('clientes accesibles y formulario sin zoom de iOS', async ({ page }, testInfo) => {
  await page.goto('/gestion/clientes');
  const mobile = (testInfo.project.use.viewport?.width ?? 1440) <= 640;
  await page
    .getByRole('button', { name: mobile ? 'Ver ficha de Clara' : 'Ver ficha', exact: true })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clara Martín' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).click();
  await expect(page.getByLabel('Correo de ejemplo')).toBeVisible();
  if (testInfo.project.name !== 'escritorio') {
    const fontSize = await page
      .getByLabel('Correo de ejemplo')
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  }
  await expectNoPageOverflow(page);
});

test('agenda semanal contenida y mes utilizable con tacto', async ({ page }, testInfo) => {
  await page.goto('/gestion');
  await page.getByRole('button', { name: 'Semana', exact: true }).click();
  await expect(page.locator('.calendar-week')).toBeVisible();
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: 'Mes', exact: true }).click();
  if ((testInfo.project.use.viewport?.width ?? 1440) <= 640) {
    await expect(page.locator('.agenda-mobile-month')).toBeVisible();
    await page.locator('.month-day-button').first().click();
    await expect(page.getByRole('button', { name: 'Día', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  } else await expect(page.locator('.calendar-month')).toBeVisible();
  await expectNoPageOverflow(page);
});

test('acciones táctiles y guardado de la política en tablet y móvil', async ({
  page,
}, testInfo) => {
  await page.goto('/gestion/configuracion');
  await page.getByLabel('Antelación mínima para cancelar (horas)').fill('12');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByText(/Configuración guardada/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Antelación mínima para cancelar (horas)')).toHaveValue('12');
  if (testInfo.project.name !== 'escritorio') {
    const smallControls = await page.locator('.button, .icon-button').evaluateAll((elements) =>
      elements
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return box.width > 0 && box.height > 0 && (box.width < 43 || box.height < 43);
        })
        .map((element) => element.textContent?.trim() || element.getAttribute('aria-label')),
    );
    expect(smallControls).toEqual([]);
  }
  await expectNoPageOverflow(page);
});
