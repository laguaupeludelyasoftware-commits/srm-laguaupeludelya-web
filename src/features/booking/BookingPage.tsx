import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, PawPrint, Plus } from 'lucide-react';
import { Button, EmptyState, Field, Modal, Notice } from '../../components/ui';
import { useDemo } from '../../data/demo-store';
import {
  addDays,
  appointmentDate,
  availableSlots,
  dateKey,
  euros,
  localDate,
  reservationBlock,
} from '../../domain/rules';
import { PetForm } from '../customer/PetForm';

/** Asistente de reserva local. Todas las reglas deben volver a verificarse en la API futura. */
export function BookingPage() {
  const { state, update } = useDemo();
  const [params] = useSearchParams();
  const client = state.clients.find((c) => c.id === state.activeClientId) ?? state.clients[0];
  const pets = state.pets.filter((p) => p.clientId === client.id);
  const [petId, setPetId] = useState(pets[0]?.id ?? '');
  const [serviceId, setServiceId] = useState(params.get('servicio') ?? '');
  const [step, setStep] = useState(0);
  const [day, setDay] = useState(addDays(dateKey(new Date()), 1));
  const [time, setTime] = useState('');
  const [addPet, setAddPet] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState('');
  const pet = pets.find((p) => p.id === petId);
  const services = state.services.filter(
    (s) =>
      s.active &&
      pet &&
      s.species.includes(pet.species) &&
      state.settings.species.includes(pet.species),
  );
  const service = services.find((s) => s.id === serviceId);
  const slots = service ? availableSlots(state, day, service) : [];
  const block = reservationBlock(client, state.appointments);
  const validTime = time && slots.includes(time);
  /** Revalida el hueco y la restricción al confirmar; evita duplicados por doble clic en la demo. */
  function confirm() {
    const reason = reservationBlock(client, state.appointments);
    if (reason || !pet || !service || !availableSlots(state, day, service).includes(time)) {
      setError(reason || 'Ese hueco ya no está disponible. Elige otro.');
      return;
    }
    const id = crypto.randomUUID();
    update((draft) =>
      draft.appointments.push({
        id,
        clientId: client.id,
        petId: pet.id,
        serviceId: service.id,
        serviceName: service.name,
        startsAt: localDate(day, time).toISOString(),
        duration: service.duration,
        price: service.price,
        status: 'confirmed',
        reason: '',
        treatment: '',
      }),
    );
    setCreated(id);
  }
  if (created)
    return (
      <section className="container booking-success">
        <span className="success-orbit">
          <CheckCircle2 size={48} strokeWidth={1.2} />
        </span>
        <span className="eyebrow">TODO LISTO EN LA DEMOSTRACIÓN</span>
        <h1>¡Un mimo en camino!</h1>
        <p>{pet?.name} ya tiene su pequeño momento reservado.</p>
        <div className="panel success-summary">
          <h3>{service?.name}</h3>
          <p>{appointmentDate(localDate(day, time).toISOString())}</p>
          <span>
            {service?.duration} min · {service && euros(service.price)} orientativos
          </span>
        </div>
        <Notice>
          No se ha creado una cita real ni enviado un correo. Puedes verla en el área cliente y en
          el panel de Lya.
        </Notice>
        <Button asChild>
          <Link to="/mi-espacio">
            Ver mis citas <ArrowRight size={17} />
          </Link>
        </Button>
      </section>
    );
  return (
    <section className="container booking-page">
      <div className="center-heading">
        <span className="eyebrow">UN RATITO SOLO PARA ÉL</span>
        <h1>
          Vamos a reservar <em>su mimo.</em>
        </h1>
        <p className="muted">
          Estás explorando como {client.name}.{' '}
          <Link to="/registro" className="inline-link">
            Crear otra cuenta de ejemplo
          </Link>
        </p>
      </div>
      <div className="booking-progress" aria-label="Progreso de reserva">
        {['Su cuidado', 'Su momento', 'Todo listo'].map((label, i) => (
          <div
            key={label}
            className={step >= i ? 'active' : ''}
            aria-current={step === i ? 'step' : undefined}
          >
            <span>{step > i ? <Check size={16} /> : i + 1}</span>
            {label}
          </div>
        ))}
      </div>
      {block && (
        <Notice error>
          {block}{' '}
          <Link to="/mi-espacio" className="inline-link">
            Ir a mi espacio
          </Link>
        </Notice>
      )}
      {error && <Notice error>{error}</Notice>}
      <div className="booking-grid">
        <div className="panel booking-form">
          {step === 0 && (
            <>
              <div className="section-bar">
                <h2>¿Quién viene a vernos?</h2>
                <Button variant="ghost" size="small" onClick={() => setAddPet(true)}>
                  <Plus size={16} /> Añadir
                </Button>
              </div>
              {!pets.length && (
                <EmptyState title="Primero, presentaciones">
                  Añade una mascota para descubrir sus cuidados.
                </EmptyState>
              )}
              <div className="choice-row">
                {pets.map((p) => (
                  <button
                    key={p.id}
                    className={`pet-choice ${petId === p.id ? 'selected' : ''}`}
                    onClick={() => {
                      setPetId(p.id);
                      setServiceId('');
                      setTime('');
                    }}
                  >
                    <PawPrint size={21} />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.species} · {p.weight} kg
                      </small>
                    </span>
                    {petId === p.id && <Check size={16} />}
                  </button>
                ))}
              </div>
              <h2 className="booking-subtitle">¿Qué cuidado necesita?</h2>
              {services.map((s) => (
                <button
                  className={`service-choice ${serviceId === s.id ? 'selected' : ''}`}
                  key={s.id}
                  onClick={() => {
                    setServiceId(s.id);
                    setTime('');
                  }}
                >
                  <div>
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <small>
                      <Clock3 size={13} /> {s.duration} min
                    </small>
                  </div>
                  <strong>
                    {euros(s.price)}
                    <small>orientativos</small>
                  </strong>
                </button>
              ))}
              {pet && !services.length && (
                <Notice>
                  No hay servicios publicados para esta especie. Lya puede ajustarlos desde el
                  panel.
                </Notice>
              )}
            </>
          )}
          {step === 1 && (
            <>
              <h2>Encontramos su huequito</h2>
              <p className="muted">Horario de ejemplo para una profesional.</p>
              <Field label="Día de la visita" htmlFor="booking-day">
                <input
                  id="booking-day"
                  type="date"
                  min={dateKey(new Date())}
                  max={addDays(dateKey(new Date()), 90)}
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    setTime('');
                  }}
                  required
                />
              </Field>
              <h3 className="booking-subtitle">Horas disponibles</h3>
              <div className="time-grid">
                {slots.map((slot) => (
                  <button
                    className={time === slot ? 'time-slot selected' : 'time-slot'}
                    key={slot}
                    onClick={() => setTime(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {!slots.length && (
                <EmptyState title="Hoy no hay huequitos">
                  Prueba otro día. Puede estar cerrado o no quedar tiempo para este cuidado.
                </EmptyState>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <h2>Un último vistazo</h2>
              <p>
                Reservarás para <strong>{pet?.name}</strong>, con {service?.name.toLowerCase()}.
              </p>
              <div className="confirmation-details">
                <span>Tu visita</span>
                <strong>{appointmentDate(localDate(day, time).toISOString())}</strong>
                <span>Duración estimada</span>
                <strong>{service?.duration} minutos</strong>
                <span>Importe orientativo</span>
                <strong>{service && euros(service.price)}</strong>
              </div>
              <Notice>
                Primera visita: Lya validará tu cuenta cuando os conozca en la peluquería.
              </Notice>
              <p className="muted">
                Cancela con al menos {state.settings.cancellationHours} horas de antelación. Tras la
                segunda cancelación inicial necesitarás revisión para reservar de nuevo.
              </p>
            </>
          )}
          <div className="booking-navigation">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={16} /> Atrás
              </Button>
            )}
            {step < 2 ? (
              <Button
                disabled={!!block || (step === 0 ? !service : !validTime)}
                onClick={() => {
                  setError('');
                  setStep(step + 1);
                }}
              >
                Continuar <ArrowRight size={16} />
              </Button>
            ) : (
              <Button disabled={!!block} onClick={confirm}>
                Confirmar reserva de ejemplo <Check size={16} />
              </Button>
            )}
          </div>
        </div>
        <aside className="booking-summary">
          <PawPrint size={27} strokeWidth={1.3} />
          <h3>Un cuidado a su medida.</h3>
          <p>Todos los pequeños detalles, juntos.</p>
          <dl>
            <dt>Compañero</dt>
            <dd>{pet?.name || 'Por elegir'}</dd>
            <dt>Cuidado</dt>
            <dd>{service?.name || 'Por elegir'}</dd>
            <dt>Visita</dt>
            <dd>{time ? `${day} · ${time}` : 'Busquemos su momento'}</dd>
          </dl>
          <div className="summary-price">
            <span>Total orientativo</span>
            <strong>{service ? euros(service.price) : '—'}</strong>
          </div>
          <small>
            Servicios, duración y tarifas de ejemplo. La disponibilidad real se comprobará en el
            servidor.
          </small>
        </aside>
      </div>
      <Modal title="Añadir una mascota" open={addPet} onOpenChange={setAddPet}>
        <PetForm clientId={client.id} onSaved={() => setAddPet(false)} />
      </Modal>
    </section>
  );
}
