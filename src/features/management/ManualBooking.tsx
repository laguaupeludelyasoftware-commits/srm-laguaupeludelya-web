import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Field, Modal, Notice } from '../../components/ui';
import { usePublicBusiness } from '../../data/public-business';
import type { Species } from '../../domain/models';
import { ownerToken } from './OwnerAccess';

export const appointmentsUrl = '/api/management/appointments';

export async function ownerRequest(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${ownerToken()}`);
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(
      detail?.message ||
        (response.status === 409
          ? 'El hueco ya no está disponible. Selecciona otro horario.'
          : 'No se pudo completar la operación.'),
    );
  }
  return response;
}

export function ManualBooking({
  day,
  onClose,
  onSaved,
}: {
  day: string;
  onClose: () => void;
  onSaved: (day: string) => void;
}) {
  const [clientId, setClient] = useState('');
  const [petId, setPet] = useState('');
  const [serviceId, setService] = useState('');
  const [date, setDate] = useState(day);
  const [startsAt, setStart] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const business = usePublicBusiness();
  const clients = useQuery({
    queryKey: ['booking-clients'],
    queryFn: async ({ signal }): Promise<{ id: string; name: string; email: string }[]> =>
      (await ownerRequest('/api/management/clients', { signal })).json(),
  });
  const pets = useQuery({
    queryKey: ['booking-pets', clientId],
    enabled: !!clientId,
    queryFn: async ({ signal }): Promise<{ id: string; name: string; species: Species }[]> =>
      (
        await ownerRequest(`/api/management/clients/${encodeURIComponent(clientId)}/pets`, {
          signal,
        })
      ).json(),
  });
  const pet = pets.data?.find((entry) => entry.id === petId);
  const services = business.data?.services.filter(
    (service) => pet && service.species.includes(pet.species),
  );
  const canSearch = !!(clientId && petId && serviceId && date);
  const slots = useQuery({
    queryKey: ['owner-availability', clientId, petId, serviceId, date],
    enabled: canSearch,
    queryFn: async ({ signal }): Promise<string[]> => {
      const params = new URLSearchParams({ clientId, petId, serviceId, date });
      return (await ownerRequest(`${appointmentsUrl}/availability?${params}`, { signal })).json();
    },
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !slots.data?.includes(startsAt)) return;
    setSaving(true);
    setError('');
    try {
      await ownerRequest(appointmentsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, petId, serviceId, startsAt }),
      });
      onSaved(date);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo guardar la cita.');
      setStart('');
      await slots.refetch();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
      title="Nueva cita"
      description="Selecciona un hueco en el horario del negocio."
    >
      <form onSubmit={save}>
        <fieldset disabled={saving} className="form-stack">
          <Field label="Cliente" htmlFor="booking-client">
            <select
              id="booking-client"
              required
              value={clientId}
              onChange={(e) => {
                setClient(e.target.value);
                setPet('');
                setService('');
                setStart('');
              }}
            >
              <option value="">Selecciona un cliente</option>
              {clients.data?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} · {client.email}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mascota" htmlFor="booking-pet">
            <select
              id="booking-pet"
              required
              value={petId}
              disabled={!clientId}
              onChange={(e) => {
                setPet(e.target.value);
                setService('');
                setStart('');
              }}
            >
              <option value="">Selecciona una mascota</option>
              {pets.data?.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Servicio" htmlFor="booking-service">
            <select
              id="booking-service"
              required
              value={serviceId}
              disabled={!petId}
              onChange={(e) => {
                setService(e.target.value);
                setStart('');
              }}
            >
              <option value="">Selecciona un servicio</option>
              {services?.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.duration} min
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha" htmlFor="booking-date">
            <input
              id="booking-date"
              required
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setStart('');
              }}
            />
          </Field>
          <Field label="Hora de Madrid" htmlFor="booking-time">
            <select
              id="booking-time"
              required
              disabled={!slots.data?.length || slots.isFetching}
              value={startsAt}
              onChange={(e) => setStart(e.target.value)}
            >
              <option value="">Selecciona un hueco</option>
              {slots.data?.map((slot) => (
                <option key={slot} value={slot}>
                  {slot.slice(11, 16)}
                </option>
              ))}
            </select>
          </Field>
          {(clients.isError || pets.isError || business.isError || slots.isError) && (
            <Notice error>No se pudieron cargar los datos de la cita.</Notice>
          )}
          {clients.data?.length === 0 && (
            <p>El directorio todavía no tiene clientes registrados.</p>
          )}
          {clientId && pets.data?.length === 0 && (
            <p>Añade una mascota desde la ficha del cliente.</p>
          )}
          {petId && services?.length === 0 && <p>No hay servicios activos para esta especie.</p>}
          {canSearch && slots.isFetching && <p role="status">Buscando huecos…</p>}
          {slots.data?.length === 0 && (
            <p>No quedan huecos para este servicio en la fecha elegida.</p>
          )}
          {error && <Notice error>{error}</Notice>}
          <Button type="submit" disabled={!startsAt || slots.isFetching || saving}>
            {saving ? 'Guardando…' : 'Guardar cita'}
          </Button>
        </fieldset>
      </form>
    </Modal>
  );
}
