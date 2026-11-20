import type { Appointment, Client, DemoState, Service } from './models';

/** Construye una fecha local sin la conversión UTC implícita de las cadenas YYYY-MM-DD. */
export function localDate(day: string, time = '00:00'): Date {
  return new Date(`${day}T${time}:00`);
}

/** Formatea el día local para controles de fecha; evita desplazarlo al día anterior por UTC. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Desplaza un día de calendario conservando su interpretación local. */
export function addDays(day: string, amount: number): string {
  const date = localDate(day, '12:00');
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

/** Explica la restricción inicial. Es ilustrativa: producción deberá comprobarla en servidor. */
export function reservationBlock(
  client: Client,
  appointments: Appointment[],
  now = new Date(),
): string {
  if (!client.verified) return 'Verifica tu correo antes de reservar.';
  if (client.reviewReason) return client.reviewReason;
  if (client.validated) return '';
  if (client.cancellations >= 2) return 'Tras dos cancelaciones, Lya debe revisar tu cuenta.';
  if (
    appointments.some(
      (a) => a.clientId === client.id && a.status === 'confirmed' && new Date(a.startsAt) > now,
    )
  ) {
    return 'Tu primera visita ya está reservada. Podrás reservar de nuevo cuando Lya valide tu cuenta.';
  }
  return '';
}

/** Clasifica la cancelación: el instante exacto del umbral todavía cuenta como dentro de plazo. */
export function isTimelyCancellation(
  appointment: Appointment,
  hours: number,
  now = new Date(),
): boolean {
  return new Date(appointment.startsAt).getTime() - now.getTime() >= hours * 3_600_000;
}

/** Calcula huecos de ejemplo de una profesional, sin solapamientos y en intervalos de 30 minutos. */
export function availableSlots(
  state: DemoState,
  day: string,
  service: Service,
  now = new Date(),
): string[] {
  const schedule = state.settings.hours.find((h) => h.day === localDate(day).getDay());
  if (!schedule?.enabled) return [];
  const start = localDate(day, schedule.start).getTime();
  const close = localDate(day, schedule.end).getTime();
  const duration = service.duration * 60_000;
  const occupied = state.appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'attended',
  );
  const slots: string[] = [];
  for (let time = start; time + duration <= close; time += 30 * 60_000) {
    if (time <= now.getTime()) continue;
    const conflict = occupied.some(
      (a) =>
        time < new Date(a.startsAt).getTime() + a.duration * 60_000 &&
        time + duration > new Date(a.startsAt).getTime(),
    );
    if (!conflict)
      slots.push(
        new Date(time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      );
  }
  return slots;
}

/** Presenta cantidades en euros conservando los céntimos cuando corresponden. */
export function bookingPrice(min: number, max?: number | null): string {
  return max != null && max > min ? `${euros(min)} – ${euros(max)}` : euros(min);
}

export function euros(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Mantiene consistencia entre listados, agenda y resumen de reserva. */
export function appointmentDate(value: string): string {
  return new Date(value).toLocaleString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const statusLabels = {
  confirmed: 'Confirmada',
  attended: 'Realizada',
  cancelled: 'Cancelada',
  rejected: 'Rechazada',
  absent: 'No presentado',
} as const;
