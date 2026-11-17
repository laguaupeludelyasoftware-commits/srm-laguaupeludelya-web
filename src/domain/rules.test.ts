import { test } from 'node:test';
import assert from 'node:assert/strict';
import { availableSlots, isTimelyCancellation, localDate, reservationBlock } from './rules.ts';
import type { Appointment, Client, DemoState, Service } from './models.ts';

const client: Client = {
  id: 'client',
  name: 'Ejemplo',
  email: 'example@example.com',
  verified: true,
  validated: false,
  cancellations: 0,
  reviewReason: '',
};
const now = localDate('2026-11-17', '09:00');
const service: Service = {
  id: 'service',
  name: 'Baño',
  description: 'Ejemplo',
  species: ['Perro'],
  price: 25,
  duration: 60,
  active: true,
};
const appointment: Appointment = {
  id: 'appointment',
  clientId: client.id,
  petId: 'pet',
  serviceId: service.id,
  serviceName: service.name,
  startsAt: localDate('2026-11-17', '17:00').toISOString(),
  duration: 60,
  price: 25,
  status: 'confirmed',
  reason: '',
  treatment: '',
};

/** Fábrica mínima de pruebas para comprobar disponibilidad sin depender de datos de interfaz. */
function schedule(appointments: Appointment[] = []): DemoState {
  return {
    version: 1,
    activeClientId: client.id,
    clients: [client],
    pets: [],
    services: [service],
    appointments,
    settings: {
      cancellationHours: 8,
      species: ['Perro'],
      hours: [{ day: 2, label: 'Martes', enabled: true, start: '09:00', end: '18:00' }],
    },
  };
}

test('el instante exacto de 8 horas se considera cancelación en plazo', () => {
  assert.equal(isTimelyCancellation(appointment, 8, now), true);
  assert.equal(isTimelyCancellation(appointment, 8, new Date(now.getTime() + 1)), false);
});
test('el plazo configurable sustituye al inicial', () => {
  assert.equal(isTimelyCancellation(appointment, 12, now), false);
  assert.equal(isTimelyCancellation(appointment, 4, now), true);
});
test('el correo sin verificar impide reservar incluso con validación presencial', () => {
  assert.match(
    reservationBlock({ ...client, verified: false, validated: true }, [], now),
    /correo/,
  );
});
test('una cuenta pendiente no puede tener una segunda cita futura confirmada', () => {
  assert.notEqual(reservationBlock(client, [appointment], now), '');
});
test('rechazos del negocio y citas ajenas no ocupan el cupo inicial de la cuenta', () => {
  assert.equal(reservationBlock(client, [{ ...appointment, status: 'rejected' }], now), '');
  assert.equal(reservationBlock(client, [{ ...appointment, clientId: 'other' }], now), '');
});
test('una cancelación permite reintento y la segunda exige revisión', () => {
  assert.equal(reservationBlock({ ...client, cancellations: 1 }, [], now), '');
  assert.match(reservationBlock({ ...client, cancellations: 2 }, [], now), /dos cancelaciones/);
});
test('la cuenta validada supera el cupo inicial pero no una restricción explícita', () => {
  assert.equal(
    reservationBlock({ ...client, validated: true, cancellations: 2 }, [appointment], now),
    '',
  );
  assert.equal(
    reservationBlock({ ...client, validated: true, reviewReason: 'Revisión' }, [], now),
    'Revisión',
  );
});
test('solo se ofrecen inicios futuros que terminen antes del cierre', () => {
  const slots = availableSlots(schedule(), '2026-11-17', service, now);
  assert.equal(slots[0], '09:30');
  assert.equal(slots.at(-1), '17:00');
  assert.equal(slots.includes('17:30'), false);
});
test('una cita ocupa su intervalo completo y permite empezar justo al terminar', () => {
  const booked = { ...appointment, startsAt: localDate('2026-11-17', '10:00').toISOString() };
  const slots = availableSlots(schedule([booked]), '2026-11-17', service, now);
  assert.equal(slots.includes('09:30'), false);
  assert.equal(slots.includes('10:00'), false);
  assert.equal(slots.includes('10:30'), false);
  assert.equal(slots.includes('11:00'), true);
});
test('una reserva rechazada libera disponibilidad y un día cerrado no ofrece huecos', () => {
  assert.equal(
    availableSlots(
      schedule([{ ...appointment, status: 'rejected' }]),
      '2026-11-17',
      service,
      now,
    ).includes('17:00'),
    true,
  );
  assert.deepEqual(availableSlots(schedule(), '2026-11-18', service, now), []);
});
