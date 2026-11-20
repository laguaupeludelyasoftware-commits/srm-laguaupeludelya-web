import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { businessDays, usePublicBusiness, type BusinessInterval } from '../../data/public-business';
import { ownerToken } from './OwnerAccess';

type EditableInterval = BusinessInterval & { key: string };

/** Carga el horario actual antes de que la dueña pueda editarlo. */
export function BusinessHoursForm() {
  const business = usePublicBusiness();
  return (
    <section className="panel settings-panel">
      <h2>Horario de atención</h2>
      {business.isPending && <p role="status">Cargando el horario…</p>}
      {business.isError && <Notice error>No se pudo consultar el horario.</Notice>}
      {business.data && <ScheduleEditor initial={business.data.hours ?? []} />}
    </section>
  );
}

function ScheduleEditor({ initial }: { initial: BusinessInterval[] }) {
  const queryClient = useQueryClient();
  const [intervals, setIntervals] = useState<EditableInterval[]>(() =>
    initial.map((interval, index) => ({ ...interval, key: `saved-${index}` })),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function change(key: string, field: 'start' | 'end', value: string) {
    setIntervals((rows) => rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
    setMessage('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);
    try {
      const response = await fetch('/api/management/hours', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${ownerToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(intervals.map(({ day, start, end }) => ({ day, start, end }))),
      });
      if (response.status === 400) {
        setError(
          'Revisa que cada cierre sea posterior a su apertura y que los tramos del día no se solapen.',
        );
        return;
      }
      if (response.status === 401 || response.status === 403) {
        setError('Vuelve a iniciar sesión para publicar el horario.');
        return;
      }
      if (!response.ok) throw new Error();
      setIntervals(
        ((await response.json()) as BusinessInterval[]).map((interval, index) => ({
          ...interval,
          key: `saved-${index}`,
        })),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['public-business'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-schedule-exceptions'] }),
      ]);
      setMessage('Horario actualizado en la web.');
    } catch {
      setError('No se pudo guardar el horario.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={save}>
      <p>
        Para un turno partido, añade dos tramos al mismo día. Deja sin tramos los días de cierre.
      </p>
      {businessDays.map((label, index) => {
        const day = index + 1;
        const rows = intervals.filter((interval) => interval.day === day);
        return (
          <fieldset key={day} className="business-hours-day" disabled={saving}>
            <legend>{label}</legend>
            {rows.length === 0 && <p className="muted">Cerrado</p>}
            {rows.map((interval, rowIndex) => (
              <div className="business-hours-row" key={interval.key}>
                <Field label="Apertura" htmlFor={`start-${interval.key}`}>
                  <input
                    id={`start-${interval.key}`}
                    type="time"
                    required
                    value={interval.start}
                    aria-label={`Apertura ${label}, tramo ${rowIndex + 1}`}
                    onChange={(event) => change(interval.key, 'start', event.target.value)}
                  />
                </Field>
                <Field label="Cierre" htmlFor={`end-${interval.key}`}>
                  <input
                    id={`end-${interval.key}`}
                    type="time"
                    required
                    value={interval.end}
                    aria-label={`Cierre ${label}, tramo ${rowIndex + 1}`}
                    onChange={(event) => change(interval.key, 'end', event.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Quitar tramo ${rowIndex + 1} de ${label}`}
                  onClick={() => {
                    setIntervals((current) => current.filter((row) => row.key !== interval.key));
                    setMessage('');
                  }}
                >
                  Quitar
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              aria-label={`Añadir tramo de ${label}`}
              onClick={() => {
                const row = { day, start: '', end: '', key: crypto.randomUUID() };
                setIntervals((current) => [...current, row]);
                setMessage('');
              }}
            >
              Añadir tramo
            </Button>
          </fieldset>
        );
      })}
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <Button type="submit" disabled={saving}>
        {saving ? 'Guardando…' : 'Publicar horario'}
      </Button>
    </form>
  );
}
