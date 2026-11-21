import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('guaupelu-owner-session', 'test-owner'));
  await page.route('**/api/management/session', (route) => route.fulfill({ status: 204 }));
});

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
  }
  const navigation = page.getByRole('navigation', { name: 'Principal' });
  await expect(navigation.getByRole('link', { name: 'Mi espacio', exact: true })).toHaveCount(0);
  await navigation.getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/iniciar-sesion/);
  await expect(page.locator('h1')).toBeVisible();
});

test('reserva completa y cancelación desde el área cliente', async ({ page }) => {
  await page.route('**/api/public/business', (route) =>
    route.fulfill({
      json: {
        contact: null,
        services: [
          {
            id: 'service-1',
            name: 'Baño y mimos',
            description: 'Baño y secado',
            species: ['Perro'],
            price: 25,
            duration: 60,
          },
        ],
      },
    }),
  );
  await page.goto('/gestion/demo/reservar');
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
  await page.goto('/gestion/demo/clientes');
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
  await page.goto('/gestion/demo/agenda');
  await expect(page.getByRole('button', { name: 'Semana', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.calendar-week')).toBeVisible();
  await expect(
    page.locator('.calendar-time-axis').getByText('09:00', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.calendar-week .calendar-day')).toHaveCount(7);
  const milo = page.getByRole('button', { name: /Milo, 10:00, 60 min/ });
  const coco = page.getByRole('button', { name: /Coco, 12:00, 90 min/ });
  const hourHeight = await page
    .locator('.calendar-week')
    .evaluate((week) =>
      Number.parseFloat(getComputedStyle(week).getPropertyValue('--calendar-hour-height')),
    );
  await expect(milo).toHaveCSS('top', `${hourHeight}px`);
  await expect(milo).toHaveCSS('height', `${hourHeight}px`);
  await expect(coco).toHaveCSS('top', `${3 * hourHeight}px`);
  await expect(coco).toHaveCSS('height', `${1.5 * hourHeight}px`);
  const scroll = page.getByRole('region', { name: 'Agenda semanal desplazable' });
  const axisShift = await scroll.evaluate((region) => {
    const axis = region.querySelector('.calendar-time-axis')!;
    const initialX = axis.getBoundingClientRect().x;
    region.scrollLeft = 120;
    const shift = axis.getBoundingClientRect().x - initialX;
    region.scrollLeft = 0;
    return shift;
  });
  expect(Math.abs(axisShift)).toBeLessThanOrEqual(1);
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: 'Día', exact: true }).click();
  const daily = page.locator('.calendar-timeline-day');
  await expect(
    daily.locator('.calendar-time-axis').getByText('09:00', { exact: true }),
  ).toBeVisible();
  await expect(daily.locator('.calendar-day')).toHaveCount(1);
  await expect(milo).toHaveCSS('top', `${hourHeight}px`);
  await expect(coco).toHaveCSS('height', `${1.5 * hourHeight}px`);
  await expectNoPageOverflow(page);
  await milo.click();
  const detail = page.getByRole('dialog', { name: 'La visita de Milo' });
  await expect(detail).toBeVisible();
  const panel = await detail.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      width: innerWidth,
      height: innerHeight,
    };
  });
  const fullscreen = panel.width <= 640 || (panel.height <= 500 && !!testInfo.project.use.hasTouch);
  expect(panel.right).toBeCloseTo(panel.width, 0);
  expect(panel.top).toBeCloseTo(0, 0);
  expect(panel.bottom).toBeCloseTo(panel.height, 0);
  if (fullscreen) expect(panel.left).toBeCloseTo(0, 0);
  else expect(panel.left).toBeGreaterThan(0);
  await detail.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(milo).toBeFocused();
  await page.getByRole('button', { name: 'Mes', exact: true }).click();
  await expect(page.locator('.calendar-time-axis')).toHaveCount(0);
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
  let cancellationHours = 8;
  const hours = [{ day: 1, start: '09:00', end: '13:00' }];
  await page.route('**/api/public/business', (route) =>
    route.fulfill({ json: { contact: null, services: [], hours } }),
  );
  await page.route('**/api/management/hours', (route) => {
    expect(route.request().postDataJSON()).toEqual([
      ...hours,
      { day: 1, start: '16:00', end: '19:00' },
    ]);
    return route.fulfill({ json: route.request().postDataJSON() });
  });
  await page.route('**/api/management/appointments/policy', (route) => {
    if (route.request().method() === 'PUT') {
      cancellationHours = route.request().postDataJSON().cancellationHours;
    }
    return route.fulfill({ json: { cancellationHours } });
  });
  await page.goto('/gestion/configuracion');
  await expect(page.locator('.business-hours-day')).toHaveCount(7);
  await expect(page.getByRole('group', { name: 'Domingo' }).getByText('Cerrado')).toBeVisible();
  await page.getByRole('button', { name: 'Añadir tramo de Lunes' }).click();
  await page.getByLabel('Apertura Lunes, tramo 2').fill('16:00');
  await page.getByLabel('Cierre Lunes, tramo 2').fill('19:00');
  await page.getByRole('button', { name: 'Publicar horario' }).click();
  await expect(page.getByText('Horario actualizado en la web.')).toBeVisible();
  const cancellation = page.locator('summary').filter({ hasText: 'Cancelación de citas' });
  await expect(page.getByLabel('Plazo de cancelación (horas)')).toBeHidden();
  await cancellation.click();
  await page.getByLabel('Plazo de cancelación (horas)').fill('12');
  await page.getByRole('button', { name: 'Guardar plazo', exact: true }).click();
  await expect(page.getByText('Plazo de cancelación guardado.')).toBeVisible();
  await page.reload();
  await cancellation.click();
  await expect(page.getByLabel('Plazo de cancelación (horas)')).toHaveValue('12');
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

test('las tarjetas de agenda resumen el periodo visible sin incluir citas canceladas', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2027-03-18T12:00:00+01:00'));
  await page.route('**/api/public/business', (route) =>
    route.fulfill({ json: { contact: null, services: [], hours: [] } }),
  );
  await page.route('**/api/management/appointments?*', (route) => {
    const rows = [
      { startsAt: '2027-03-18T10:00:00', duration: 45, status: 'CONFIRMED' },
      { startsAt: '2027-03-19T11:00:00', duration: 60, status: 'CONFIRMED' },
      { startsAt: '2027-03-25T10:00:00', duration: 75, status: 'CONFIRMED' },
      { startsAt: '2027-03-18T12:00:00', duration: 90, status: 'CANCELLED_ON_TIME' },
      { startsAt: '2027-04-01T10:00:00', duration: 30, status: 'CONFIRMED' },
    ];
    return route.fulfill({
      json: rows.map((row, index) => ({
        ...row,
        id: String(index),
        petName: 'Milo',
        clientName: 'Ana',
        serviceName: 'Baño',
        price: 25,
      })),
    });
  });
  await page.goto('/gestion');
  await expect(page.getByText(/Prototipo · Datos de ejemplo/)).toHaveCount(0);
  const count = page.locator('.stat-card').filter({ hasText: 'Citas confirmadas' });
  const duration = page.locator('.stat-card').filter({ hasText: 'Tiempo de cuidados' });
  await expect(count).toHaveText(/de la semana\s*02/);
  await expect(duration).toHaveText(/de la semana\s*1 h 45 min/);
  await page.getByRole('button', { name: 'Día', exact: true }).click();
  await expect(count).toHaveText(/del día\s*01/);
  await expect(duration).toHaveText(/del día\s*0 h 45 min/);
  await page.getByRole('button', { name: 'Mes', exact: true }).click();
  await expect(count).toHaveText(/del mes\s*03/);
  await expect(duration).toHaveText(/del mes\s*3 h 0 min/);
  await page.getByRole('button', { name: 'Periodo siguiente' }).click();
  await expect(count).toHaveText(/del mes\s*01/);
  await expect(duration).toHaveText(/del mes\s*0 h 30 min/);
  await expectNoPageOverflow(page);
});
