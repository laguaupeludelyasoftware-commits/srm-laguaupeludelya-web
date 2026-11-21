import { SettingsSection } from './SettingsSection';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { appointmentsUrl, ownerRequest } from './ManualBooking';

export function BookingPolicyForm() {
  const path = `${appointmentsUrl}/policy`;
  const policy = useQuery({
    queryKey: ['owner-booking-policy'],
    queryFn: async ({ signal }): Promise<{ cancellationHours: number }> =>
      (await ownerRequest(path, { signal })).json(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cancellationHours = Number(new FormData(event.currentTarget).get('hours'));
    setError(false);
    setSaved(false);
    setSaving(true);
    try {
      await ownerRequest(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationHours }),
      });
      await policy.refetch();
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection title="Cancelación de citas">
      <p>
        El plazo guardado se aplica a las nuevas citas. Cada cita conserva el plazo con el que se
        reservó.
      </p>
      {policy.isPending && <p role="status">Cargando plazo…</p>}
      {policy.isError && <Notice error>No se pudo consultar el plazo de cancelación.</Notice>}
      {policy.data && (
        <form className="form-stack" onSubmit={save}>
          <Field label="Plazo de cancelación (horas)" htmlFor="live-cancellation-hours">
            <input
              id="live-cancellation-hours"
              name="hours"
              type="number"
              min={0}
              max={168}
              required
              key={policy.data.cancellationHours}
              defaultValue={policy.data.cancellationHours}
            />
          </Field>
          <Button type="submit" disabled={saving}>
            Guardar plazo
          </Button>
        </form>
      )}
      {error && <Notice error>No se pudo guardar el plazo.</Notice>}
      {saved && <Notice>Plazo de cancelación guardado.</Notice>}
    </SettingsSection>
  );
}
