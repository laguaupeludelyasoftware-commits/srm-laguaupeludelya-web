import { useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  PawPrint,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { PageHeading } from '../../components/layout';
import { Button, Modal, Notice } from '../../components/ui';
import { useDemo } from '../../data/demo-store';
import { usePublicBusiness } from '../../data/public-business';
import { addDays, dateKey, euros, localDate, statusLabels } from '../../domain/rules';
import type { Appointment } from '../../domain/models';
import { AppointmentDialog } from './AppointmentDialog';
import { WhatsAppReminder } from './WhatsAppActions';
import { appointmentsUrl, ManualBooking, ownerRequest } from './ManualBooking';

type AgendaAppointment = Pick<
  Appointment,
  'id' | 'startsAt' | 'duration' | 'price' | 'serviceName' | 'status'
> & { petName: string; clientName: string };
type StoredAppointment = Omit<AgendaAppointment, 'status'> & {
  status: 'CONFIRMED' | 'CANCELLED_ON_TIME' | 'CANCELLED_LATE' | 'ATTENDED' | 'ABSENT' | 'REJECTED';
  canRecordAttendance: boolean;
  clientId: string;
  petId: string;
  clientPhone?: string;
};

const storedStatuses: Record<StoredAppointment['status'], Appointment['status']> = {
  CONFIRMED: 'confirmed',
  CANCELLED_ON_TIME: 'cancelled',
  CANCELLED_LATE: 'cancelled',
  ATTENDED: 'attended',
  ABSENT: 'absent',
  REJECTED: 'rejected',
};

const minutesPerDay = 24 * 60;
const hourHeight = 88;

function startMinute(appointment: AgendaAppointment) {
  return timeMinute(appointmentTime(appointment));
}

function appointmentTime(appointment: AgendaAppointment) {
  if (!appointment.startsAt.endsWith('Z')) return appointment.startsAt.slice(11, 16);
  return new Date(appointment.startsAt).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeMinute(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

/** Asigna carriles para que las citas que coincidan puedan abrirse por separado. */
function placeAppointments(appointments: AgendaAppointment[]) {
  const laneEnds: number[] = [];
  const cards = appointments.map((appointment) => {
    const start = startMinute(appointment);
    const end = Math.min(minutesPerDay, start + appointment.duration);
    const freeLane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    const lane = freeLane === -1 ? laneEnds.length : freeLane;
    laneEnds[lane] = end;
    return { appointment, start, end, lane };
  });
  return { cards, lanes: Math.max(1, laneEnds.length) };
}

export function AgendaPage({ demo = false }: { demo?: boolean }) {
  const { state } = useDemo();
  const today = demo
    ? dateKey(new Date())
    : new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
  const queryClient = useQueryClient();
  const business = usePublicBusiness();
  const [booking, setBooking] = useState(false);
  const [attendancePending, setAttendancePending] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [day, setDay] = useState(today);
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const timedView = view !== 'month';
  const [selected, setSelected] = useState<string | null>(null);
  const appointmentTrigger = useRef<HTMLButtonElement | null>(null);
  const reviewCount = state.clients.filter(
    (c) => !c.validated && (c.reviewReason || c.cancellations >= 2),
  ).length;
  const start =
    view === 'month'
      ? new Date(localDate(day).getFullYear(), localDate(day).getMonth(), 1)
      : localDate(day);
  if (view === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const count =
    view === 'day'
      ? 1
      : view === 'week'
        ? 7
        : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: count }, (_, i) => addDays(dateKey(start), i));
  const from = days[0];
  const until = addDays(from, count);
  const agenda = useQuery({
    queryKey: ['owner-agenda', from, until],
    enabled: !demo,
    queryFn: async ({ signal }): Promise<StoredAppointment[]> =>
      (await ownerRequest(`${appointmentsUrl}?from=${from}&until=${until}`, { signal })).json(),
  });
  const appointments: AgendaAppointment[] = demo
    ? state.appointments.map((appointment) => ({
        ...appointment,
        petName: state.pets.find((pet) => pet.id === appointment.petId)?.name ?? '',
        clientName: state.clients.find((client) => client.id === appointment.clientId)?.name ?? '',
      }))
    : (agenda.data ?? []).map((appointment) => ({
        ...appointment,
        status: storedStatuses[appointment.status] ?? 'confirmed',
      }));
  const appointmentDay = (appointment: AgendaAppointment) =>
    demo ? dateKey(new Date(appointment.startsAt)) : appointment.startsAt.slice(0, 10);
  const confirmed = appointments.filter(
    (a) => a.status === 'confirmed' && appointmentDay(a) === day,
  );
  const minutes = confirmed.reduce((sum, a) => sum + a.duration, 0);
  const columns = days.map((date) => ({
    date,
    appointments: appointments
      .filter((appointment) => appointmentDay(appointment) === date)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  }));
  const weekday = localDate(day).getDay();
  const hours = demo
    ? state.settings.hours.filter((entry) => entry.enabled)
    : (business.data?.hours ?? []).map((entry) => ({ ...entry, day: entry.day % 7 }));
  const openingHours = hours.filter((entry) => view !== 'day' || entry.day === weekday);
  const visibleAppointments = columns.flatMap((column) => column.appointments);
  const rangeStart =
    Math.floor(
      Math.min(
        ...(openingHours.length ? openingHours.map((hours) => timeMinute(hours.start)) : [9 * 60]),
        ...visibleAppointments.map(startMinute),
      ) / 60,
    ) * 60;
  const rangeEnd = Math.min(
    minutesPerDay,
    Math.ceil(
      Math.max(
        ...(openingHours.length ? openingHours.map((hours) => timeMinute(hours.end)) : [18 * 60]),
        ...visibleAppointments.map(
          (appointment) => startMinute(appointment) + appointment.duration,
        ),
      ) / 60,
    ) * 60,
  );
  const hourCount = Math.max(1, (rangeEnd - rangeStart) / 60);
  const timelineHeight = hourCount * hourHeight;
  const position = (minute: number) => ((minute - rangeStart) / 60) * hourHeight;
  const activeAppointment = state.appointments.find((a) => a.id === selected) ?? null;
  const storedAppointment = agenda.data?.find((a) => a.id === selected);
  async function updateAppointment(
    id: string,
    action: 'attendance' | 'reject',
    payload: { attended: boolean; validate: boolean } | { reason: string },
  ) {
    setAttendancePending(true);
    setAttendanceError('');
    try {
      await ownerRequest(`${appointmentsUrl}/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await queryClient.invalidateQueries({ queryKey: ['owner-agenda'] });
      await queryClient.invalidateQueries({ queryKey: ['online-booking-visits'] });
      setRejecting(false);
    } catch {
      setAttendanceError(
        'No se pudo actualizar la cita. Actualiza la agenda y vuelve a intentarlo.',
      );
    } finally {
      setAttendancePending(false);
    }
  }
  /** Mueve la fecha según la vista; mes se ancla en día 1 para no saltar meses cortos. */
  function move(direction: number) {
    if (view === 'month') {
      const next = localDate(day);
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
      setDay(dateKey(next));
    } else setDay(addDays(day, direction * (view === 'week' ? 7 : 1)));
  }
  /** Tarjeta reutilizada por cada vista sin duplicar los estados de la reserva. */
  function renderAppointment(a: AgendaAppointment) {
    return (
      <button
        className={`agenda-appointment agenda-${a.status}`}
        key={a.id}
        onClick={(event) => {
          appointmentTrigger.current = event.currentTarget;
          setSelected(a.id);
        }}
      >
        <div className="appointment-time">
          {appointmentTime(a)}
          <small>{a.duration} min</small>
        </div>
        <span className="pet-avatar">
          <PawPrint size={19} />
        </span>
        <div className="agenda-appointment-copy">
          <h3>{a.petName}</h3>
          <p>
            {a.serviceName} · {a.clientName}
          </p>
        </div>
        <span className={`badge badge-${a.status}`}>{statusLabels[a.status]}</span>
        <ChevronRight size={17} />
      </button>
    );
  }

  function renderTimedAppointments(appointments: AgendaAppointment[]) {
    const { cards, lanes } = placeAppointments(appointments);
    return cards.map(({ appointment, start, end, lane }) => {
      const name = appointment.petName || appointment.serviceName;
      const time = appointmentTime(appointment);
      return (
        <button
          type="button"
          key={appointment.id}
          className={`timed-appointment agenda-${appointment.status}`}
          style={{
            top: position(start),
            height: position(end) - position(start),
            left: `calc(${(lane * 100) / lanes}% + 2px)`,
            width: `calc(${100 / lanes}% - 4px)`,
          }}
          onClick={(event) => {
            appointmentTrigger.current = event.currentTarget;
            setSelected(appointment.id);
          }}
          aria-label={`${name}, ${time}, ${appointment.duration} min, ${statusLabels[appointment.status]}`}
        >
          <strong>{name}</strong>
          <small>
            {time} · {appointment.duration} min
          </small>
          {view === 'day' && (
            <small>
              {[appointment.serviceName, appointment.clientName].filter(Boolean).join(' · ')}
            </small>
          )}
        </button>
      );
    });
  }
  return (
    <>
      <PageHeading
        eyebrow="CADA VISITA CUENTA"
        title="Un buen día empieza aquí."
        description="Un vistazo a los pequeños que vienen a verte."
        action={
          demo ? (
            <Button asChild>
              <Link to="/gestion/demo/reservar">
                <Plus size={17} /> Probar nueva reserva
              </Link>
            </Button>
          ) : (
            <Button onClick={() => setBooking(true)}>
              <Plus size={17} /> Nueva cita
            </Button>
          )
        }
      />
      {!demo && agenda.isPending && <p role="status">Cargando citas…</p>}
      {!demo && agenda.isError && <Notice error>No se pudo cargar la agenda.</Notice>}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <CalendarDays size={21} />
          </span>
          <div>
            <small>Citas confirmadas del día</small>
            <strong>{confirmed.length.toString().padStart(2, '0')}</strong>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon peach">
            <Clock3 size={21} />
          </span>
          <div>
            <small>Tiempo de cuidados</small>
            <strong>
              {Math.floor(minutes / 60)}
              <small> h </small>
              {minutes % 60}
              <small> min</small>
            </strong>
          </div>
        </div>
        {demo && (
          <Link className="stat-card stat-link" to="/gestion/demo/clientes?revision=1">
            <span className="stat-icon lavender">
              <ShieldCheck size={21} />
            </span>
            <div>
              <small>Clientes por revisar</small>
              <strong>{reviewCount.toString().padStart(2, '0')}</strong>
            </div>
            <ChevronRight size={17} />
          </Link>
        )}
      </div>
      <div className="panel agenda-panel">
        <div className="agenda-toolbar">
          <div className="date-navigation">
            <Button
              variant="ghost"
              size="small"
              onClick={() => move(-1)}
              aria-label="Periodo anterior"
            >
              <ChevronLeft size={19} />
            </Button>
            <h2>
              {view === 'week'
                ? new Intl.DateTimeFormat('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }).formatRange(start, localDate(days[6]))
                : localDate(day).toLocaleDateString('es-ES', {
                    day: view === 'month' ? undefined : 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
            </h2>
            <Button
              variant="ghost"
              size="small"
              onClick={() => move(1)}
              aria-label="Periodo siguiente"
            >
              <ChevronRight size={19} />
            </Button>
            <Button variant="outline" size="small" onClick={() => setDay(today)}>
              Hoy
            </Button>
          </div>
          <div className="segmented" aria-label="Vista de agenda">
            {(['day', 'week', 'month'] as const).map((value, i) => (
              <button
                key={value}
                className={view === value ? 'active' : ''}
                aria-pressed={view === value}
                onClick={() => setView(value)}
              >
                {['Día', 'Semana', 'Mes'][i]}
              </button>
            ))}
          </div>
        </div>
        {view === 'week' && (
          <p className="calendar-swipe-hint">
            Desliza la agenda para consultar los días de la semana.
          </p>
        )}
        {view === 'month' && (
          <div className="agenda-mobile-month" aria-label="Días del mes">
            {days.map((date) => {
              const count = appointments.filter(
                (a) => appointmentDay(a) === date && a.status === 'confirmed',
              ).length;
              return (
                <button
                  className="month-day-button"
                  key={date}
                  onClick={() => {
                    setDay(date);
                    setView('day');
                  }}
                  aria-label={`Ver ${localDate(date).toLocaleDateString('es-ES')}, ${count} citas`}
                >
                  <strong>{localDate(date).getDate()}</strong>
                  <span>
                    {localDate(date).toLocaleDateString('es-ES', { weekday: 'long' })}
                    <small>
                      {count
                        ? `${count} ${count === 1 ? 'visita confirmada' : 'visitas confirmadas'}`
                        : 'Sin citas confirmadas'}
                    </small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              );
            })}
          </div>
        )}
        <div
          className="calendar-scroll"
          role={view === 'week' ? 'region' : undefined}
          aria-label={view === 'week' ? 'Agenda semanal desplazable' : undefined}
          tabIndex={view === 'week' ? 0 : undefined}
        >
          <div
            className={`${view === 'day' ? 'calendar-timeline-day' : `calendar-${view}`}${timedView ? ' calendar-timed' : ''}`}
            style={
              timedView
                ? ({ '--calendar-hour-height': `${hourHeight}px` } as CSSProperties)
                : undefined
            }
          >
            {timedView && (
              <div className="calendar-time-axis" aria-hidden="true">
                <div className="timeline-heading">Hora</div>
                <div className="calendar-timeline" style={{ height: timelineHeight }}>
                  {Array.from({ length: hourCount + 1 }, (_, index) => (
                    <span key={index} className="calendar-hour" style={{ top: index * hourHeight }}>
                      {String(rangeStart / 60 + index).padStart(2, '0')}:00
                    </span>
                  ))}
                </div>
              </div>
            )}
            {columns.map(({ date, appointments }) => {
              return (
                <div key={date} className={`calendar-day ${date === today ? 'is-today' : ''}`}>
                  <div className={`calendar-day-label ${timedView ? 'timeline-heading' : ''}`}>
                    <span>{localDate(date).toLocaleDateString('es-ES', { weekday: 'long' })}</span>
                    <strong>{localDate(date).getDate()}</strong>
                    {date === today && <small>HOY</small>}
                  </div>
                  {timedView ? (
                    <div className="calendar-timeline" style={{ height: timelineHeight }}>
                      {view === 'day' && !appointments.length && (demo || agenda.isSuccess) && (
                        <p className="timeline-empty">Todavía no hay citas para este día.</p>
                      )}
                      {renderTimedAppointments(appointments)}
                    </div>
                  ) : (
                    appointments.map(renderAppointment)
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="dashboard-note">
        <PawPrint size={22} />
        <div>
          <strong>Todo a su ritmo.</strong>
          <p>
            {demo
              ? 'Esta agenda usa tiempos y horarios de ejemplo.'
              : 'Las citas se muestran en el horario de Madrid.'}
          </p>
        </div>
        <Link to={demo ? '/gestion/demo/configuracion' : '/gestion/configuracion'}>
          Ver horarios <ChevronRight size={15} />
        </Link>
      </div>
      {demo && activeAppointment && (
        <AppointmentDialog
          key={activeAppointment.id}
          appointment={activeAppointment}
          onClose={() => setSelected(null)}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            appointmentTrigger.current?.focus({ preventScroll: true });
          }}
        />
      )}
      {!demo && storedAppointment && (
        <Modal
          open
          placement="right"
          title={`La visita de ${storedAppointment.petName}`}
          description={`${localDate(storedAppointment.startsAt.slice(0, 10)).toLocaleDateString('es-ES')} · ${appointmentTime({ ...storedAppointment, status: 'confirmed' })}`}
          onOpenChange={(open) => {
            if (!open && !attendancePending) {
              setAttendanceError('');
              setRejecting(false);
              setSelected(null);
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            appointmentTrigger.current?.focus({ preventScroll: true });
          }}
        >
          {storedAppointment.clientId ? (
            <>
              <p>
                <Link
                  to={`/gestion/clientes?cliente=${encodeURIComponent(storedAppointment.clientId)}`}
                >
                  {storedAppointment.clientName}
                </Link>
              </p>
              <p>
                <Link
                  to={`/gestion/clientes?cliente=${encodeURIComponent(storedAppointment.clientId)}&mascota=${encodeURIComponent(storedAppointment.petId)}`}
                >
                  Ficha de {storedAppointment.petName}
                </Link>
              </p>
            </>
          ) : (
            <p>{storedAppointment.clientName}</p>
          )}
          <p>
            {storedAppointment.serviceName} · {storedAppointment.duration} min ·{' '}
            {euros(storedAppointment.price)}
          </p>
          <p>
            {storedAppointment.status === 'CANCELLED_LATE'
              ? 'Cancelada fuera de plazo'
              : statusLabels[storedStatuses[storedAppointment.status] ?? 'confirmed']}
          </p>
          {storedAppointment.status === 'CONFIRMED' &&
            storedAppointment.canRecordAttendance === false && (
              <WhatsAppReminder
                key={storedAppointment.id}
                phone={storedAppointment.clientPhone}
                petName={storedAppointment.petName}
                serviceName={storedAppointment.serviceName}
                startsAt={storedAppointment.startsAt}
              />
            )}
          {storedAppointment.canRecordAttendance && (
            <div className="form-stack">
              <Button
                disabled={attendancePending}
                onClick={() =>
                  void updateAppointment(storedAppointment.id, 'attendance', {
                    attended: true,
                    validate: true,
                  })
                }
              >
                Registrar asistencia y validar cliente
              </Button>
              <Button
                variant="outline"
                disabled={attendancePending}
                onClick={() =>
                  void updateAppointment(storedAppointment.id, 'attendance', {
                    attended: true,
                    validate: false,
                  })
                }
              >
                Registrar solo asistencia
              </Button>
              <Button
                variant="outline"
                disabled={attendancePending}
                onClick={() =>
                  void updateAppointment(storedAppointment.id, 'attendance', {
                    attended: false,
                    validate: false,
                  })
                }
              >
                Marcar no presentación
              </Button>
            </div>
          )}
          {storedAppointment.status === 'CONFIRMED' &&
            (rejecting ? (
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  const reason = String(
                    new FormData(event.currentTarget).get('reason') ?? '',
                  ).trim();
                  if (reason) void updateAppointment(storedAppointment.id, 'reject', { reason });
                }}
              >
                <label htmlFor="rejection-reason">Motivo visible para el cliente</label>
                <textarea id="rejection-reason" name="reason" required maxLength={500} />
                <Button type="submit" variant="danger" disabled={attendancePending}>
                  Confirmar cancelación
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={attendancePending}
                  onClick={() => setRejecting(false)}
                >
                  Conservar cita
                </Button>
              </form>
            ) : (
              <Button
                variant="outline"
                disabled={attendancePending}
                onClick={() => setRejecting(true)}
              >
                Cancelar desde el negocio
              </Button>
            ))}
          {attendanceError && <Notice error>{attendanceError}</Notice>}
        </Modal>
      )}
      {booking && (
        <ManualBooking
          day={day}
          onClose={() => setBooking(false)}
          onSaved={(date) => {
            setDay(date);
            setBooking(false);
            void queryClient.invalidateQueries({ queryKey: ['owner-agenda'] });
            void queryClient.invalidateQueries({ queryKey: ['owner-availability'] });
          }}
        />
      )}
    </>
  );
}
