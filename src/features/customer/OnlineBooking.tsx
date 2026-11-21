import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, PawPrint } from 'lucide-react';
import { Button, Field, Notice } from '../../components/ui';
import { usePublicBusiness } from '../../data/public-business';
import { addDays, bookingPrice, euros, localDate } from '../../domain/rules';
import { BookingExtras, bookingParams, useBookingQuote } from '../booking/BookingExtras';
import { ClientPets, useClientPets } from './ClientPets';

const url = '/api/auth/client/appointments';
const madridDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' });
const shortDay = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
const fullDay = new Intl.DateTimeFormat('es-ES', { dateStyle: 'full' });
const monthAndYear = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
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
  const today = madridDate.format(new Date());
  const [weekStart, setWeekStart] = useState(today);
  const [firstPetSaved, setFirstPetSaved] = useState(false);
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
  const pets = useClientPets(token);
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
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const canCheckAvailability = canQuote && quote.isSuccess && !quote.isPlaceholderData;
  const availability = useQueries({
    queries: days.map((day) => ({
      queryKey: ['online-booking-slots', token, petId, serviceId, day, extraIds],
      enabled: canCheckAvailability && day >= today,
      gcTime: 0,
      retry: false,
      queryFn: async ({ signal }): Promise<string[]> => {
        const result = await request(
          `${url}/availability?${bookingParams({ date: day, petId, serviceId }, extraIds)}`,
          { signal },
        );
        if (result.status === 403)
          throw new Error(
            'Contacta con Nazaret para revisar tu cuenta antes de volver a reservar.',
          );
        if (result.status === 409) throw new Error('Ya tienes una cita futura.');
        if (!result.ok) throw new Error('No se pudieron consultar los huecos.');
        return result.json();
      },
    })),
  });
  const slots = availability[days.indexOf(date)];
  const availableStart = !!(
    slots?.data?.includes(start) &&
    !slots.isFetching &&
    !slots.isError &&
    date >= today
  );
  const availabilityError =
    slots?.error ??
    (!availability.some((day) => day.isSuccess || day.isFetching)
      ? availability.find((day) => day.isError)?.error
      : null);

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
    if (!pending && canCheckAvailability && !quote.isFetching && availableStart) void update();
  }

  function moveWeek(offset: number) {
    const nextWeek = addDays(weekStart, offset);
    setWeekStart(nextWeek < today ? today : nextWeek);
    setDate('');
    setStart('');
  }

  return (
    <div className="panel settings-panel">
      <h1>Reservar cita</h1>
      {pets.isPending && <p role="status">Cargando tus mascotas…</p>}
      {(pets.isError || business.isError) && (
        <Notice error>No se pudieron cargar las mascotas o los servicios.</Notice>
      )}
      {pets.isError && <Button onClick={() => void pets.refetch()}>Reintentar</Button>}
      {pets.data?.length === 0 && (
        <section className="online-booking-step" aria-labelledby="first-pet-heading">
          <p className="online-booking-step-label">
            <PawPrint size={16} /> Paso 1 de 2
          </p>
          <h2 id="first-pet-heading">Añade tu primera mascota</h2>
          <p>Necesitamos su ficha para mostrarte los servicios y horarios que puedes reservar.</p>
          <ClientPets
            token={token}
            onFirstPetSaved={(id) => {
              setPet(id);
              setFirstPetSaved(true);
            }}
          />
        </section>
      )}
      {pets.data && pets.data.length > 0 && (
        <form className="form-stack" onSubmit={submit}>
          {firstPetSaved && (
            <div className="online-booking-step">
              <p className="online-booking-step-label">
                <CalendarDays size={16} /> Paso 2 de 2
              </p>
              <h2>Elige el servicio y el horario</h2>
              <p role="status">Hemos guardado la ficha de {pet?.name}.</p>
            </div>
          )}
          <p>Puedes tener una cita futura a la vez mientras Nazaret valida tu ficha.</p>
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
          <section className="online-calendar" aria-labelledby="online-calendar-heading">
            <h2 id="online-calendar-heading">Fecha y hora</h2>
            <p>Mostramos los huecos libres de la agenda para este servicio. Hora de Madrid.</p>
            <Field label="Fecha" htmlFor="online-date">
              <input
                id="online-date"
                type="date"
                min={today}
                disabled={!canCheckAvailability}
                value={date}
                onChange={(event) => {
                  const next = event.target.value;
                  setDate(next);
                  if (next >= today && !days.includes(next)) setWeekStart(next);
                  setStart('');
                }}
              />
            </Field>
            {!canQuote && <p>Elige una mascota y un servicio para consultar los horarios.</p>}
            {canCheckAvailability && (
              <>
                <div className="online-calendar-heading">
                  <Button
                    type="button"
                    variant="outline"
                    size="small"
                    aria-label="Semana anterior"
                    disabled={weekStart <= today}
                    onClick={() => moveWeek(-7)}
                  >
                    <ChevronLeft size={18} />
                  </Button>
                  <strong>{monthAndYear.format(localDate(weekStart, '12:00'))}</strong>
                  <Button
                    type="button"
                    variant="outline"
                    size="small"
                    aria-label="Semana siguiente"
                    onClick={() => moveWeek(7)}
                  >
                    <ChevronRight size={18} />
                  </Button>
                </div>
                <div className="online-calendar-days" role="group" aria-label="Días de reserva">
                  {days.map((day, index) => {
                    const daySlots = availability[index];
                    const available =
                      daySlots.isSuccess && daySlots.data.length > 0 && day >= today;
                    const dayLabel = fullDay.format(localDate(day, '12:00'));
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={!available}
                        aria-pressed={day === date}
                        aria-label={`${dayLabel}${daySlots.isSuccess && !available ? ', sin huecos' : ''}`}
                        onClick={() => {
                          setDate(day);
                          setStart('');
                        }}
                      >
                        <span>{shortDay.format(localDate(day, '12:00'))}</span>
                        <strong>{Number(day.slice(-2))}</strong>
                      </button>
                    );
                  })}
                </div>
                {availability.some((day) => day.isFetching) && (
                  <p role="status">Buscando huecos…</p>
                )}
                {availabilityError && <Notice error>{availabilityError.message}</Notice>}
                {date && slots?.isSuccess && !slots.data.length && (
                  <p>No quedan huecos para esta fecha.</p>
                )}
                {!date && availability.every((day) => day.isSuccess && !day.data.length) && (
                  <p>No quedan huecos en estos días. Prueba con la semana siguiente.</p>
                )}
                {!!slots?.data?.length && !slots.isError && (
                  <fieldset
                    className="online-calendar-times"
                    disabled={slots.isFetching || pending}
                  >
                    <legend>Horas disponibles</legend>
                    <div>
                      {slots.data.map((slot) => (
                        <label key={slot}>
                          <input
                            type="radio"
                            name="online-time"
                            checked={start === slot}
                            onChange={() => setStart(slot)}
                          />
                          <span>{slot.slice(11, 16)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </>
            )}
          </section>
          <Button
            type="submit"
            disabled={!canCheckAvailability || !availableStart || pending || quote.isFetching}
          >
            Confirmar cita
          </Button>
        </form>
      )}
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
