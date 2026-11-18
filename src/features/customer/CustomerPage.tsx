import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Cat, Dog, Mail, PawPrint, Plus, ShieldCheck } from 'lucide-react';
import { Button, EmptyState, Modal, Notice } from '../../components/ui';
import { useDemo } from '../../data/demo-store';
import {
  appointmentDate,
  euros,
  isTimelyCancellation,
  reservationBlock,
  statusLabels,
} from '../../domain/rules';
import type { Appointment } from '../../domain/models';
import { PetForm } from './PetForm';

/** Área cliente con mascotas y citas locales, sin exponer notas privadas de gestión. */
export function CustomerPage() {
  const { state, update } = useDemo();
  const client = state.clients.find((c) => c.id === state.activeClientId) ?? state.clients[0];
  const [addPet, setAddPet] = useState(false);
  const [cancel, setCancel] = useState<Appointment | null>(null);
  const [message, setMessage] = useState('');
  const pets = state.pets.filter((p) => p.clientId === client.id);
  const appointments = state.appointments
    .filter((a) => a.clientId === client.id)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const block = reservationBlock(client, state.appointments);
  /** Aplica la política inicial a una cita confirmada; el backend futuro garantizará atomicidad. */
  function cancelAppointment() {
    if (!cancel) return;
    const timely = isTimelyCancellation(cancel, state.settings.cancellationHours);
    update((draft) => {
      const appointment = draft.appointments.find((a) => a.id === cancel.id);
      const customer = draft.clients.find((c) => c.id === client.id);
      if (!appointment || appointment.status !== 'confirmed' || !customer) return;
      appointment.status = 'cancelled';
      appointment.reason = timely
        ? 'Cancelación del cliente en plazo.'
        : 'Cancelación del cliente fuera de plazo.';
      if (!customer.validated) {
        customer.cancellations++;
        if (!timely)
          customer.reviewReason =
            'Cancelación fuera de plazo. Contacta con Nazaret para volver a reservar.';
        else if (customer.cancellations >= 2)
          customer.reviewReason =
            'Dos cancelaciones. Nazaret debe revisar tu cuenta para volver a reservar.';
      }
    });
    setCancel(null);
    setMessage('Cita cancelada en la demostración. No se ha enviado ningún correo.');
  }
  return (
    <section className="container customer-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">VUESTRO PEQUEÑO RINCÓN</span>
          <h1>
            Hola, {client.name.split(' ')[0]}{' '}
            <span className="heading-paw">
              <PawPrint size={30} />
            </span>
          </h1>
          <p className="muted">Sus cuidados, sus visitas y todos sus pequeños detalles.</p>
        </div>
        <Button asChild>
          <Link to="/gestion/demo/reservar">
            <Plus size={17} /> Reservar una cita
          </Link>
        </Button>
      </div>
      {message && <Notice>{message}</Notice>}
      {!client.verified && (
        <Notice>
          <Mail size={19} /> Correo pendiente.{' '}
          <Button
            size="small"
            onClick={() =>
              update((d) => {
                const c = d.clients.find((c) => c.id === client.id);
                if (c) c.verified = true;
              })
            }
          >
            Simular verificación
          </Button>
        </Notice>
      )}
      <div className="customer-grid">
        <div>
          <div className="section-bar">
            <h2>Sus próximas aventuras</h2>
            <CalendarDays size={21} />
          </div>
          {appointments.length === 0 ? (
            <EmptyState
              title="Su primer mimo está por llegar"
              action={
                <Button asChild size="small">
                  <Link to="/gestion/demo/reservar">Buscar un hueco</Link>
                </Button>
              }
            >
              Todavía no habéis reservado ninguna visita.
            </EmptyState>
          ) : (
            <div className="appointment-list">
              {appointments.map((a) => (
                <article className="panel appointment-card" key={a.id}>
                  <div className="appointment-top">
                    <span className={`badge badge-${a.status}`}>{statusLabels[a.status]}</span>
                    <small className="muted">{appointmentDate(a.startsAt)}</small>
                  </div>
                  <h3>
                    {state.pets.find((p) => p.id === a.petId)?.name} · {a.serviceName}
                  </h3>
                  <p className="muted">
                    {a.duration} min · {euros(a.price)} orientativos
                  </p>
                  {a.reason && <div className="appointment-reason">{a.reason}</div>}
                  {a.status === 'confirmed' && new Date(a.startsAt) > new Date() && (
                    <Button variant="ghost" size="small" onClick={() => setCancel(a)}>
                      No podemos asistir · Cancelar
                    </Button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
        <aside>
          <div className="panel validation-card">
            <ShieldCheck size={24} />
            <h3>{client.validated ? 'Ya sois de la familia' : 'Vuestra primera visita'}</h3>
            <p>
              {client.validated
                ? 'Nazaret ha validado tu cuenta. Puedes reservar nuevas visitas.'
                : 'Hasta conoceros en persona, podéis tener una única cita futura activa.'}
            </p>
            <div className="policy-counter">
              <span>Cancelaciones iniciales</span>
              <strong>{client.cancellations} / 2</strong>
            </div>
            <small>Antelación mínima: {state.settings.cancellationHours} horas.</small>
            {block && <p className="validation-message">{block}</p>}
          </div>
          <div className="section-bar">
            <h2>Mis mascotas</h2>
            <Button
              size="small"
              variant="ghost"
              onClick={() => setAddPet(true)}
              aria-label="Añadir mascota"
            >
              <Plus size={19} />
            </Button>
          </div>
          {pets.map((pet) => (
            <div className="pet-card" key={pet.id}>
              <span className="pet-avatar">{pet.species === 'Gato' ? <Cat /> : <Dog />}</span>
              <div>
                <h3>{pet.name}</h3>
                <p>
                  {pet.breed || pet.species} · {pet.weight} kg
                </p>
                <small>{pet.coat}</small>
              </div>
            </div>
          ))}
          {!pets.length && <p className="muted">Añade a tu primer compañero.</p>}
        </aside>
      </div>
      <Modal title="Un nuevo compañero" open={addPet} onOpenChange={setAddPet}>
        <PetForm clientId={client.id} onSaved={() => setAddPet(false)} />
      </Modal>
      <Modal
        title="¿Cancelamos esta visita?"
        description="Podrás revisar las condiciones antes de confirmar."
        open={!!cancel}
        onOpenChange={(open) => {
          if (!open) setCancel(null);
        }}
      >
        {cancel && (
          <>
            <p>
              {cancel.serviceName} · {appointmentDate(cancel.startsAt)}
            </p>
            <Notice>
              {isTimelyCancellation(cancel, state.settings.cancellationHours)
                ? 'Estás dentro del plazo permitido.'
                : 'Quedan menos horas de las permitidas. Podrás avisar de la cancelación, pero si tu cuenta no está validada necesitarás revisión para reservar de nuevo.'}
            </Notice>
            {!client.validated && (
              <p>
                Esta será tu cancelación número {client.cancellations + 1}. Tras la segunda, Nazaret
                deberá revisar tu cuenta.
              </p>
            )}
            <div className="dialog-actions">
              <Button variant="outline" onClick={() => setCancel(null)}>
                Conservar cita
              </Button>
              <Button variant="danger" onClick={cancelAppointment}>
                Sí, cancelar cita
              </Button>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}
