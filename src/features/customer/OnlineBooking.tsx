import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Field, Notice } from '../../components/ui';
import { usePublicBusiness } from '../../data/public-business';
import type { Species } from '../../domain/models';
import { bookingPrice, euros } from '../../domain/rules';
import { BookingExtras, bookingParams, useBookingQuote } from '../booking/BookingExtras';

const url = '/api/auth/client/appointments';
type Visit = {
  id: string;
  startsAt: string;
  duration: number;
  price: number;
  serviceName: string;
  petName: string;
  status: 'CONFIRMED' | 'CANCELLED_ON_TIME' | 'CANCELLED_LATE' | 'ATTENDED' | 'ABSENT' | 'REJECTED';
  canCancel: boolean;
  cancellationHours: number;
  rejectionReason: string | null;
  extraNames?: string[];
  variantName?: string | null;
  priceMax?: number | null;
};

const visitLabels: Record<Visit['status'], string> = {
  CONFIRMED: 'Confirmada',
  CANCELLED_ON_TIME: 'Cancelada en plazo',
  CANCELLED_LATE: 'Cancelada fuera de plazo',
  ATTENDED: 'Realizada',
  ABSENT: 'No presentación',
  REJECTED: 'Cancelada por La Guaupelu de Lya',
};

export function OnlineBooking({
  token,
  initialService,
}: {
  token: string;
  initialService: string;
}) {
  const [petId, setPet] = useState('');
  const [serviceId, setService] = useState(initialService);
  const [extraIds, setExtras] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [cancelId, setCancelId] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const business = usePublicBusiness();
  const request = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(path, { ...options, headers });
  };
  const pets = useQuery({
    queryKey: ['online-booking-pets', token],
    gcTime: 0,
    queryFn: async ({ signal }): Promise<{ id: string; name: string; species: Species }[]> => {
      const result = await request('/api/auth/client/pets', { signal });
      if (!result.ok) throw new Error();
      return result.json();
    },
  });
  const visitsKey = ['online-booking-visits', token];
  const visits = useQuery({
    queryKey: visitsKey,
    gcTime: 0,
    queryFn: async ({ signal }): Promise<Visit[]> => {
      const result = await request(url, { signal });
      if (!result.ok) throw new Error();
      return result.json();
    },
  });
  const pet = pets.data?.find((entry) => entry.id === petId);
  const services = business.data?.services.filter(
    (service) => !pet || service.species.includes(pet.species),
  );
  const selected = services?.find((entry) => entry.id === serviceId);
  const canQuote = !!(pet && selected);
  const quote = useBookingQuote(
    url,
    token,
    bookingParams({ petId, serviceId }, extraIds),
    canQuote,
  );
  const slots = useQuery({
    queryKey: ['online-booking-slots', token, petId, serviceId, date, extraIds],
    enabled: !!(canQuote && date && quote.isSuccess && !quote.isPlaceholderData),
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }): Promise<string[]> => {
      const result = await request(
        `${url}/availability?${bookingParams({ date, petId, serviceId }, extraIds)}`,
        { signal },
      );
      if (result.status === 403)
        throw new Error('Contacta con Nazaret para revisar tu cuenta antes de volver a reservar.');
      if (result.status === 409) throw new Error('Ya tienes una cita futura.');
      if (!result.ok) throw new Error('No se pudieron consultar los huecos.');
      return result.json();
    },
  });

  async function update(visitId?: string) {
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = await request(visitId ? `${url}/${visitId}/cancel` : url, {
        method: 'POST',
        ...(visitId
          ? {}
          : {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                petId,
                serviceId,
                startsAt: start,
                extraIds,
                expectedPrice: quote.data?.price,
                expectedDuration: quote.data?.duration,
                expectedPriceMax: quote.data?.priceMax ?? quote.data?.price,
              }),
            }),
      });
      if (result.status === 403) throw new Error('Contacta con Nazaret para revisar tu cuenta.');
      if (result.status === 409)
        throw new Error('La cita o el hueco ya no están disponibles. Revisa tus citas.');
      if (!result.ok) throw new Error('No se pudo completar la operación.');
      setMessage(visitId ? 'Cita cancelada.' : 'Cita confirmada.');
      setCancelId('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo completar la operación.');
      if (!visitId) await quote.refetch();
    } finally {
      setStart('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: visitsKey }),
        queryClient.invalidateQueries({ queryKey: ['online-booking-slots', token] }),
        queryClient.invalidateQueries({ queryKey: ['owner-agenda'] }),
      ]);
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending && quote.data && !quote.isFetching && start && slots.data?.includes(start))
      void update();
  }

  return (
    <div className="panel settings-panel">
      <h1>Reservar cita</h1>
      <p>Puedes tener una cita futura a la vez mientras Nazaret valida tu ficha.</p>
      {(pets.isError || business.isError) && (
        <Notice error>No se pudieron cargar las mascotas o los servicios.</Notice>
      )}
      {pets.data?.length === 0 && (
        <p>
          Añade una mascota desde <Link to="/mi-espacio">Mi espacio</Link> para reservar.
        </p>
      )}
      <form className="form-stack" onSubmit={submit}>
        <Field label="Mascota" htmlFor="online-pet">
          <select
            id="online-pet"
            required
            value={petId}
            onChange={(event) => {
              const next = pets.data?.find((entry) => entry.id === event.target.value);
              setPet(event.target.value);
              if (next && selected && !selected.species.includes(next.species)) setService('');
              setExtras([]);
              setStart('');
            }}
          >
            <option value="">Selecciona tu mascota</option>
            {pets.data?.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Servicio" htmlFor="online-service">
          <select
            id="online-service"
            required
            value={selected?.id ?? ''}
            onChange={(event) => {
              setService(event.target.value);
              setExtras([]);
              setStart('');
            }}
          >
            <option value="">Selecciona un servicio</option>
            {services?.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </Field>
        {canQuote ? (
          <BookingExtras
            quote={quote}
            selected={extraIds}
            onChange={(ids) => {
              setExtras(ids);
              setStart('');
            }}
          />
        ) : (
          selected && (
            <p>
              {selected.duration} min · {euros(selected.price)}
            </p>
          )
        )}
        <Field label="Fecha" htmlFor="online-date">
          <input
            id="online-date"
            type="date"
            required
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setStart('');
            }}
          />
        </Field>
        <Field label="Hora de Madrid" htmlFor="online-time">
          <select
            id="online-time"
            required
            disabled={!slots.data?.length || slots.isFetching}
            value={start}
            onChange={(event) => setStart(event.target.value)}
          >
            <option value="">Selecciona un hueco</option>
            {slots.data?.map((slot) => (
              <option key={slot} value={slot}>
                {slot.slice(11, 16)}
              </option>
            ))}
          </select>
        </Field>
        {slots.isFetching && <p role="status">Buscando huecos…</p>}
        {slots.isError && <Notice error>{slots.error.message}</Notice>}
        {slots.data?.length === 0 && <p>No quedan huecos para esta fecha.</p>}
        <Button type="submit" disabled={!start || pending || slots.isFetching || quote.isFetching}>
          Confirmar cita
        </Button>
      </form>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <h2>Mis citas</h2>
      {visits.isError && <Notice error>No se pudieron consultar tus citas.</Notice>}
      {visits.isPending && <p role="status">Cargando citas…</p>}
      {visits.data?.length === 0 && <p>Aún no tienes citas.</p>}
      {visits.data?.map((visit) => (
        <div key={visit.id} className="panel settings-panel">
          <h3>
            {visit.petName} · {visit.serviceName}
          </h3>
          {!!visit.extraNames?.length && <p>Extras: {visit.extraNames.join(', ')}</p>}
          {visit.variantName && <p>Variante: {visit.variantName}</p>}
          <p>
            {visit.startsAt.slice(0, 10).split('-').reverse().join('/')} ·{' '}
            {visit.startsAt.slice(11, 16)} · {visit.duration} min ·{' '}
            {bookingPrice(visit.price, visit.priceMax)}
          </p>
          <p>{visitLabels[visit.status]}</p>
          {visit.rejectionReason && <p>{visit.rejectionReason}</p>}
          {visit.canCancel &&
            (cancelId === visit.id ? (
              <>
                <p>
                  El plazo de esta cita es de {visit.cancellationHours} h. Mientras tu ficha esté
                  pendiente de validación presencial, cancelar fuera de plazo o cancelar por segunda
                  vez en plazo requiere revisión.
                </p>
                <Button disabled={pending} onClick={() => void update(visit.id)}>
                  Confirmar cancelación
                </Button>
                <Button disabled={pending} variant="ghost" onClick={() => setCancelId('')}>
                  Conservar cita
                </Button>
              </>
            ) : (
              <Button disabled={pending} variant="outline" onClick={() => setCancelId(visit.id)}>
                Cancelar cita
              </Button>
            ))}
        </div>
      ))}
    </div>
  );
}
