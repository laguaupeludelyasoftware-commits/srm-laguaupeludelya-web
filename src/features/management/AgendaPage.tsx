import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Button, EmptyState } from '../../components/ui';
import { useDemo } from '../../data/demo-store';
import { addDays, dateKey, localDate, statusLabels } from '../../domain/rules';
import type { Appointment } from '../../domain/models';
import { AppointmentDialog } from './AppointmentDialog';

/** Agenda de demostración con vistas de día, semana y mes sobre la misma colección local. */
export function AgendaPage() {
  const { state } = useDemo();
  const today = dateKey(new Date());
  const [day, setDay] = useState(today);
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [selected, setSelected] = useState<string | null>(null);
  const confirmed = state.appointments.filter(
    (a) => a.status === 'confirmed' && dateKey(new Date(a.startsAt)) === day,
  );
  const reviewCount = state.clients.filter(
    (c) => !c.validated && (c.reviewReason || c.cancellations >= 2),
  ).length;
  const minutes = confirmed.reduce((sum, a) => sum + a.duration, 0);
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
  const activeAppointment = state.appointments.find((a) => a.id === selected) ?? null;
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
  function renderAppointment(a: Appointment) {
    const pet = state.pets.find((p) => p.id === a.petId);
    const client = state.clients.find((c) => c.id === a.clientId);
    return (
      <button
        className={`agenda-appointment agenda-${a.status}`}
        key={a.id}
        onClick={() => setSelected(a.id)}
      >
        <div className="appointment-time">
          {new Date(a.startsAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          <small>{a.duration} min</small>
        </div>
        <span className="pet-avatar">
          <PawPrint size={19} />
        </span>
        <div className="agenda-appointment-copy">
          <h3>
            {pet?.name} <small>{pet?.species}</small>
          </h3>
          <p>
            {a.serviceName} · {client?.name}
          </p>
        </div>
        <span className={`badge badge-${a.status}`}>{statusLabels[a.status]}</span>
        <ChevronRight size={17} />
      </button>
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="CADA VISITA CUENTA"
        title="Un buen día empieza aquí."
        description="Un vistazo a los pequeños que vienen a verte."
        action={
          <Button asChild>
            <Link to="/gestion/demo/reservar">
              <Plus size={17} /> Probar nueva reserva
            </Link>
          </Button>
        }
      />
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
              {localDate(day).toLocaleDateString('es-ES', {
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
              const count = state.appointments.filter(
                (a) => dateKey(new Date(a.startsAt)) === date && a.status === 'confirmed',
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
          <div className={`calendar-${view}`}>
            {days.map((date) => {
              const appointments = state.appointments
                .filter((a) => dateKey(new Date(a.startsAt)) === date)
                .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
              return (
                <div key={date} className={`calendar-day ${date === today ? 'is-today' : ''}`}>
                  <div className="calendar-day-label">
                    <span>{localDate(date).toLocaleDateString('es-ES', { weekday: 'long' })}</span>
                    <strong>{localDate(date).getDate()}</strong>
                    {date === today && <small>HOY</small>}
                  </div>
                  {view === 'day' && !appointments.length ? (
                    <EmptyState title="Un día con espacio para nuevos mimos">
                      Todavía no hay citas para este día.
                    </EmptyState>
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
            Esta agenda usa tiempos y horarios de ejemplo. Puedes ajustarlos en la configuración.
          </p>
        </div>
        <Link to="/gestion/configuracion">
          Ver horarios <ChevronRight size={15} />
        </Link>
      </div>
      {activeAppointment && (
        <AppointmentDialog
          key={activeAppointment.id}
          appointment={activeAppointment}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
