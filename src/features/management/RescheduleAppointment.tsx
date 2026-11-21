import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { appointmentsUrl, ownerRequest } from './ManualBooking';

export function RescheduleAppointment({
  id,
  startsAt,
  today,
  onSaved,
}: {
  id: string;
  startsAt: string;
  today: string;
  onSaved: (day: string) => void;
}) {
  const path = `${appointmentsUrl}/${encodeURIComponent(id)}/reschedule`;
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(startsAt.slice(0, 10));
  const [newStart, setNewStart] = useState('');
  const slots = useQuery({
    queryKey: ['reschedule-slots', id, startsAt, date],
    enabled: open && date >= today,
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }): Promise<string[]> =>
      (
        await ownerRequest(`${path}/availability?${new URLSearchParams({ date })}`, { signal })
      ).json(),
  });
  const save = useMutation({
    mutationFn: async (selection: string) => {
      await ownerRequest(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedStart: startsAt, startsAt: selection }),
      });
      return selection.slice(0, 10);
    },
    onSuccess: onSaved,
    onError: async () => {
      setNewStart('');
      await slots.refetch();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!save.isPending && !slots.isFetching && slots.data?.includes(newStart))
      save.mutate(newStart);
  }

  if (!open)
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Cambiar fecha u hora
      </Button>
    );
  return (
    <form className="form-stack" onSubmit={submit}>
      <fieldset disabled={save.isPending} className="form-stack">
        <legend>Nuevo horario de la cita</legend>
        <Field label="Nueva fecha" htmlFor="reschedule-date">
          <input
            id="reschedule-date"
            type="date"
            min={today}
            value={date}
            required
            onChange={(event) => {
              setDate(event.target.value);
              setNewStart('');
              save.reset();
            }}
          />
        </Field>
        <Field label="Nueva hora de Madrid" htmlFor="reschedule-time">
          <SelectField
            id="reschedule-time"
            required
            value={newStart}
            disabled={!slots.data?.length || slots.isFetching}
            onValueChange={setNewStart}
            placeholder="Elige un hueco"
            options={(slots.data ?? []).map((slot) => ({ value: slot, label: slot.slice(11, 16) }))}
          />
        </Field>
        {date >= today && slots.isFetching && <p role="status">Buscando huecos…</p>}
        {slots.isError && (
          <Notice error>
            No se pudieron consultar los huecos. Vuelve a abrir la cita para actualizarla.
          </Notice>
        )}
        {slots.data?.length === 0 && <p>No hay otro hueco disponible en esa fecha.</p>}
        {save.isError && (
          <Notice error>No se pudo reprogramar. Elige otro hueco o vuelve a abrir la cita.</Notice>
        )}
        <div className="dialog-actions">
          <Button type="submit" disabled={!newStart || slots.isFetching}>
            Confirmar cambio
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setNewStart('');
              save.reset();
            }}
          >
            Volver al detalle
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
