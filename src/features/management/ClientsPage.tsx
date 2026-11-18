import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cat, Dog, Plus, Search, ShieldCheck } from 'lucide-react';
import { PageHeading } from '../../components/layout';
import { Button, EmptyState, Field, Modal, Notice } from '../../components/ui';
import { useDemo } from '../../data/demo-store';
import { appointmentDate } from '../../domain/rules';

/** Gestión de clientes y validación, con historial por mascota y búsqueda local. */
export function ClientsPage() {
  const { state, update } = useDemo();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [reviewOnly, setReviewOnly] = useState(params.has('revision'));
  const [selectedId, setSelectedId] = useState('');
  const [create, setCreate] = useState(false);
  const [message, setMessage] = useState('');
  const selected = state.clients.find((c) => c.id === selectedId);
  const clients = state.clients.filter(
    (c) =>
      (!reviewOnly || (!c.validated && !!(c.reviewReason || c.cancellations >= 2))) &&
      `${c.name} ${c.email} ${state.pets
        .filter((p) => p.clientId === c.id)
        .map((p) => p.name)
        .join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  /** Alta manual ya validada presencialmente; la verificación del correo continúa pendiente. */
  function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim();
    const email = String(data.get('email')).trim().toLowerCase();
    if (!name || state.clients.some((c) => c.email.toLowerCase() === email)) {
      setMessage('Revisa el nombre o utiliza un correo de ejemplo que no exista.');
      return;
    }
    update((d) =>
      d.clients.push({
        id: crypto.randomUUID(),
        name,
        email,
        verified: false,
        validated: true,
        validatedAt: new Date().toISOString(),
        cancellations: 0,
        reviewReason: '',
      }),
    );
    setCreate(false);
    setMessage('Cliente creado y validado. Invitación simulada: no se ha enviado ningún correo.');
  }
  /** Validación explícita por la dueña; no modifica la verificación del correo. */
  function validateClient() {
    update((d) => {
      const c = d.clients.find((c) => c.id === selectedId);
      if (c) {
        c.validated = true;
        c.reviewReason = '';
        c.validatedAt = new Date().toISOString();
      }
    });
    setMessage('Validación presencial guardada en la demostración.');
  }
  return (
    <>
      <PageHeading
        eyebrow="MUCHO MÁS QUE UNA FICHA"
        title="Sus personas y sus patitas."
        description="Conoce sus detalles y acompaña cada nueva visita."
        action={
          <Button onClick={() => setCreate(true)}>
            <Plus size={17} /> Nuevo cliente
          </Button>
        }
      />
      {message && <Notice>{message}</Notice>}
      <div className="list-toolbar">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Buscar clientes o mascotas"
            placeholder="Busca una persona, un correo o una mascota…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className={`filter-chip ${reviewOnly ? 'active' : ''}`}
          aria-pressed={reviewOnly}
          onClick={() => setReviewOnly(!reviewOnly)}
        >
          <ShieldCheck size={16} /> Necesitan revisión
        </button>
      </div>
      <div className="clients-mobile-grid" aria-label="Clientes en formato de tarjetas">
        {clients.map((client) => (
          <article className="panel client-mobile-card" key={client.id}>
            <h2>{client.name}</h2>
            <p className="muted">{client.email}</p>
            <div className="client-mobile-badges">
              <span
                className={`badge ${client.validated ? 'badge-attended' : client.reviewReason ? 'badge-rejected' : 'badge-confirmed'}`}
              >
                {client.validated
                  ? 'Validado'
                  : client.reviewReason
                    ? 'Necesita revisión'
                    : 'Primera visita'}
              </span>
              <span className="badge">Correo {client.verified ? 'verificado' : 'pendiente'}</span>
            </div>
            <p>
              {state.pets
                .filter((pet) => pet.clientId === client.id)
                .map((pet) => pet.name)
                .join(', ') || 'Todavía sin mascotas'}
            </p>
            <p className="muted">Cancelaciones iniciales: {client.cancellations} / 2</p>
            <Button variant="outline" onClick={() => setSelectedId(client.id)}>
              Ver ficha de {client.name.split(' ')[0]}
            </Button>
          </article>
        ))}
        {!clients.length && (
          <EmptyState title="No hay coincidencias">
            Prueba otro nombre o desactiva el filtro.
          </EmptyState>
        )}
      </div>
      <div className="panel table-wrap clients-desktop-table">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Sus compañeros</th>
              <th>Correo</th>
              <th>Validación presencial</th>
              <th>Cancelaciones</th>
              <th>
                <span className="sr-only">Acción</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  <small>{c.email}</small>
                </td>
                <td>
                  {state.pets
                    .filter((p) => p.clientId === c.id)
                    .map((p) => p.name)
                    .join(', ') || 'Sin mascotas'}
                </td>
                <td>
                  <span className={`badge ${c.verified ? 'badge-attended' : 'badge-cancelled'}`}>
                    {c.verified ? 'Verificado' : 'Pendiente'}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${c.validated ? 'badge-attended' : c.reviewReason ? 'badge-rejected' : 'badge-confirmed'}`}
                  >
                    {c.validated ? 'Validado' : c.reviewReason ? 'Revisar' : 'Primera visita'}
                  </span>
                </td>
                <td>{c.cancellations} / 2</td>
                <td>
                  <Button variant="ghost" size="small" onClick={() => setSelectedId(c.id)}>
                    Ver ficha
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!clients.length && (
          <EmptyState title="No hay coincidencias">
            Prueba otro nombre o desactiva el filtro.
          </EmptyState>
        )}
      </div>
      <Modal
        title={selected?.name ?? 'Ficha de cliente'}
        description="Datos ficticios, validación e historial de cuidados."
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId('');
        }}
      >
        {selected && (
          <>
            <p className="muted">{selected.email}</p>
            <div className="policy-summary">
              <div>
                <strong>
                  {selected.validated
                    ? 'Validación presencial aprobada'
                    : 'Pendiente de validación presencial'}
                </strong>
                <p>
                  {selected.reviewReason ||
                    (selected.validated
                      ? 'Puede reservar sin el límite inicial.'
                      : 'Una única cita futura activa.')}
                </p>
              </div>
              <span className="badge">{selected.cancellations} / 2 cancelaciones</span>
            </div>
            {selected.validatedAt && (
              <small className="muted">
                Validado por Nazaret · {appointmentDate(selected.validatedAt)}
              </small>
            )}
            {!selected.validated && (
              <Button onClick={validateClient}>
                <ShieldCheck size={17} /> Validar presencialmente
              </Button>
            )}
            <h3 className="booking-subtitle">Mascotas e historial</h3>
            {state.pets
              .filter((p) => p.clientId === selected.id)
              .map((p) => (
                <div className="pet-history" key={p.id}>
                  <div className="pet-card">
                    <span className="pet-avatar">{p.species === 'Gato' ? <Cat /> : <Dog />}</span>
                    <div>
                      <h3>{p.name}</h3>
                      <p>
                        {p.breed || p.species} · {p.weight} kg · {p.coat}
                      </p>
                    </div>
                  </div>
                  {p.notes && <p className="muted">Observaciones: {p.notes}</p>}
                  {state.appointments
                    .filter((a) => a.petId === p.id && a.status === 'attended')
                    .map((a) => (
                      <div className="history-note" key={a.id}>
                        <small>{appointmentDate(a.startsAt)}</small>
                        <strong>{a.serviceName}</strong>
                        <p>{a.treatment || 'Sin notas de tratamiento.'}</p>
                      </div>
                    ))}
                </div>
              ))}
            {!state.pets.some((p) => p.clientId === selected.id) && (
              <p className="muted">Todavía no hay mascotas asociadas.</p>
            )}
          </>
        )}
      </Modal>
      <Modal
        title="Un nuevo cliente"
        description="Alta manual de demostración. La validación presencial quedará aprobada."
        open={create}
        onOpenChange={setCreate}
      >
        <form className="form-stack" onSubmit={createClient}>
          <Field label="Nombre" htmlFor="client-name">
            <input id="client-name" name="name" required maxLength={100} />
          </Field>
          <Field label="Correo de ejemplo" htmlFor="client-email">
            <input
              id="client-email"
              name="email"
              type="email"
              required
              placeholder="cliente@example.com"
            />
          </Field>
          <Notice>
            La invitación para verificar el correo y establecer contraseña se simula, sin envío
            real.
          </Notice>
          <Button type="submit">Crear cliente validado</Button>
        </form>
      </Modal>
    </>
  );
}
