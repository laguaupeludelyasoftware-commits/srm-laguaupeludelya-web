import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { localDate } from '../../domain/rules';
import { ownerRequest } from './ManualBooking';
import { ownerToken } from './OwnerAccess';

const endpoint = '/api/management/hours/exceptions';
const listKey = ['owner-schedule-exceptions'];
type Interval = { start: string; end: string };
type Day = { date: string; intervals: Interval[] };
type DateSchedule = Day & { exceptional: boolean };
type Conflict = {
  id: string;
  startsAt: string;
  endsAt: string;
  petName: string;
  serviceName: string;
};
type Row = Interval & { key: string };

function rowsFor(intervals: Interval[]) {
  return intervals.map((interval) => ({ ...interval, key: crypto.randomUUID() }));
}

function dateLabel(date: string) {
  return localDate(date).toLocaleDateString('es-ES', { dateStyle: 'full' });
}

export function ScheduleExceptionsForm() {
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [date, setDate] = useState(today);
  const exceptions = useQuery({
    queryKey: listKey,
    queryFn: async ({ signal }): Promise<Day[]> =>
      (await ownerRequest(endpoint, { signal })).json(),
  });
  const schedule = useQuery({
    queryKey: [...listKey, date],
    enabled: date >= today,
    queryFn: async ({ signal }): Promise<DateSchedule> =>
      (await ownerRequest(`${endpoint}/${encodeURIComponent(date)}`, { signal })).json(),
  });

  return (
    <section className="panel settings-panel" id="horarios-excepcionales">
      <h2>Horarios excepcionales</h2>
      <p>
        Modifica el horario de una fecha para bloquear horas, cerrar el día o hacer una apertura
        especial.
      </p>
      <Field label="Fecha de la excepción" htmlFor="exception-date">
        <input
          id="exception-date"
          type="date"
          min={today}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </Field>
      {date >= today && schedule.isPending && <p role="status">Cargando horario de la fecha…</p>}
      {schedule.isError && <Notice error>No se pudo consultar el horario de esa fecha.</Notice>}
      {schedule.data && <ExceptionEditor key={date} initial={schedule.data} />}
      <h3>Próximas excepciones</h3>
      {exceptions.isPending && <p role="status">Cargando excepciones…</p>}
      {exceptions.isError && <Notice error>No se pudieron consultar las excepciones.</Notice>}
      {exceptions.data?.length === 0 && <p>No hay excepciones próximas.</p>}
      {!!exceptions.data?.length && (
        <ul className="form-stack">
          {exceptions.data.map((day) => (
            <li key={day.date} className="section-bar">
              <span>
                {dateLabel(day.date)} ·{' '}
                {day.intervals.length
                  ? day.intervals.map((i) => `${i.start}–${i.end}`).join(' y ')
                  : 'Cerrado'}
              </span>
              <Button type="button" variant="outline" onClick={() => setDate(day.date)}>
                Editar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ExceptionEditor({ initial }: { initial: DateSchedule }) {
  const client = useQueryClient();
  const [draft, setRows] = useState<Row[]>();
  const rows =
    draft ?? initial.intervals.map((interval, index) => ({ ...interval, key: `saved-${index}` }));
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [feedback, setFeedback] = useState<{
    error?: string;
    message?: string;
    conflicts?: Conflict[];
  }>({});
  const save = useMutation({
    mutationFn: async (restore: boolean) => {
      const response = await fetch(`${endpoint}/${encodeURIComponent(initial.date)}`, {
        method: restore ? 'DELETE' : 'PUT',
        headers: { Authorization: `Bearer ${ownerToken()}`, 'Content-Type': 'application/json' },
        body: restore ? undefined : JSON.stringify(rows.map(({ start, end }) => ({ start, end }))),
      });
      if (response.status === 409) {
        const result: { appointments: Conflict[] } = await response.json();
        return { conflicts: result.appointments };
      }
      if (response.status === 400)
        throw new Error('Revisa la fecha y que los tramos sean válidos y no se solapen.');
      if (!response.ok) throw new Error('No se pudo guardar el horario de la fecha.');
      const next: DateSchedule = restore
        ? await (await ownerRequest(`${endpoint}/${initial.date}`)).json()
        : await response.json();
      return { next };
    },
    onSuccess: async (result, restore) => {
      if (result.conflicts) {
        setFeedback({ conflicts: result.conflicts });
        return;
      }
      if (!result.next) return;
      client.setQueryData([...listKey, initial.date], result.next);
      setRows(undefined);
      setBlockStart('');
      setBlockEnd('');
      setFeedback({ message: restore ? 'Horario semanal recuperado.' : 'Excepción guardada.' });
      await Promise.all([
        client.invalidateQueries({ queryKey: listKey, exact: true }),
        client.invalidateQueries({ queryKey: ['owner-availability'] }),
        client.invalidateQueries({ queryKey: ['online-booking-slots'] }),
      ]);
    },
    onError: (error) => setFeedback({ error: error.message }),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback({});
    save.mutate(false);
  }

  /** Recorta los tramos abiertos y conserva los fragmentos a cada lado del bloqueo. */
  function applyBlock() {
    if (
      !blockStart ||
      !blockEnd ||
      blockStart >= blockEnd ||
      rows.some((row) => !row.start || !row.end || row.start >= row.end)
    ) {
      setFeedback({ error: 'Completa los tramos y elige una hora final posterior a la inicial.' });
      return;
    }
    if (!rows.some((row) => row.start < blockEnd && row.end > blockStart)) {
      setFeedback({ error: 'Ese bloque queda fuera de las horas de atención.' });
      return;
    }
    setRows(
      rowsFor(
        rows.flatMap((row) => {
          if (row.start >= blockEnd || row.end <= blockStart)
            return [{ start: row.start, end: row.end }];
          const remaining: Interval[] = [];
          if (row.start < blockStart) remaining.push({ start: row.start, end: blockStart });
          if (row.end > blockEnd) remaining.push({ start: blockEnd, end: row.end });
          return remaining;
        }),
      ),
    );
    setBlockStart('');
    setBlockEnd('');
    setFeedback({
      message: 'Bloque aplicado. Guarda la excepción para actualizar la disponibilidad.',
    });
  }

  function updateRow(key: string, field: 'start' | 'end', value: string) {
    setRows(rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
    setFeedback({});
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <fieldset className="business-hours-day" disabled={save.isPending}>
        <legend>{dateLabel(initial.date)}</legend>
        <p>
          {initial.exceptional
            ? 'Esta fecha tiene un horario excepcional.'
            : 'La fecha sigue el horario semanal.'}
        </p>
        {rows.length === 0 && <p>Cerrado todo el día</p>}
        {rows.map((row, index) => (
          <div className="business-hours-row" key={row.key}>
            <Field label={`Apertura del tramo ${index + 1}`} htmlFor={`exception-start-${row.key}`}>
              <input
                id={`exception-start-${row.key}`}
                type="time"
                required
                value={row.start}
                onChange={(event) => updateRow(row.key, 'start', event.target.value)}
              />
            </Field>
            <Field label={`Cierre del tramo ${index + 1}`} htmlFor={`exception-end-${row.key}`}>
              <input
                id={`exception-end-${row.key}`}
                type="time"
                required
                value={row.end}
                onChange={(event) => updateRow(row.key, 'end', event.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Quitar tramo ${index + 1}`}
              onClick={() => {
                setRows(rows.filter((entry) => entry.key !== row.key));
                setFeedback({});
              }}
            >
              Quitar
            </Button>
          </div>
        ))}
        <div className="dialog-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setRows([...rows, ...rowsFor([{ start: '', end: '' }])]);
              setFeedback({});
            }}
          >
            Añadir tramo
          </Button>
          {!!rows.length && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRows([]);
                setFeedback({});
              }}
            >
              Cerrar todo el día
            </Button>
          )}
        </div>
      </fieldset>
      {!!rows.length && (
        <fieldset className="business-hours-day" disabled={save.isPending}>
          <legend>Bloquear unas horas</legend>
          <div className="business-hours-row">
            <Field label="Inicio del bloqueo" htmlFor="exception-block-start">
              <input
                id="exception-block-start"
                type="time"
                value={blockStart}
                onChange={(event) => setBlockStart(event.target.value)}
              />
            </Field>
            <Field label="Fin del bloqueo" htmlFor="exception-block-end">
              <input
                id="exception-block-end"
                type="time"
                value={blockEnd}
                onChange={(event) => setBlockEnd(event.target.value)}
              />
            </Field>
            <Button type="button" variant="outline" onClick={applyBlock}>
              Aplicar bloqueo
            </Button>
          </div>
        </fieldset>
      )}
      {feedback.error && <Notice error>{feedback.error}</Notice>}
      {feedback.message && <Notice>{feedback.message}</Notice>}
      {!!feedback.conflicts?.length && (
        <Notice error>
          <p>
            El cambio deja fuera del horario estas citas confirmadas. El horario guardado sigue
            vigente.
          </p>
          <ul>
            {feedback.conflicts.map((appointment) => (
              <li key={appointment.id}>
                {appointment.startsAt.slice(11, 16)}–{appointment.endsAt.slice(11, 16)} ·{' '}
                {appointment.petName} · {appointment.serviceName}
              </li>
            ))}
          </ul>
        </Notice>
      )}
      <div className="dialog-actions">
        <Button type="submit" disabled={save.isPending}>
          Guardar excepción
        </Button>
        {initial.exceptional && (
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={() => {
              setFeedback({});
              save.mutate(true);
            }}
          >
            Recuperar horario semanal
          </Button>
        )}
      </div>
    </form>
  );
}
