import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { ownerRequest } from './ManualBooking';

const path = '/api/management/whatsapp-reminders';
const key = ['owner-whatsapp-reminders'];
type Policy = { enabled: boolean; leadHours: number };
type Settings = Policy & {
  providerEnabled: boolean;
  attempts: {
    appointmentId: string;
    startsAt: string;
    status: string;
    httpStatus: number | null;
  }[];
};
const labels: Record<string, string> = {
  PROCESSING: 'Intento iniciado',
  ACCEPTED: 'Aceptado por WhatsApp',
  REJECTED: 'Rechazado por WhatsApp',
  UNKNOWN: 'Resultado sin confirmar',
  SKIPPED: 'Omitido por cambio en la cita o el contacto',
};

export function ReminderSettings() {
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: key,
    gcTime: 0,
    queryFn: async ({ signal }): Promise<Settings> => (await ownerRequest(path, { signal })).json(),
  });
  const save = useMutation({
    mutationFn: async (policy: Policy): Promise<Settings> =>
      (
        await ownerRequest(path, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(policy),
        })
      ).json(),
    onSuccess: (value) => client.setQueryData(key, value),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    save.mutate({
      enabled: settings.data?.providerEnabled ? data.has('enabled') : false,
      leadHours: Number(data.get('hours')),
    });
  }

  return (
    <section className="panel settings-panel">
      <h2>Recordatorios automáticos por WhatsApp</h2>
      {settings.isPending && <p role="status">Cargando configuración…</p>}
      {settings.isError && <Notice error>No se pudo consultar la configuración.</Notice>}
      {settings.data && (
        <>
          {!settings.data.providerEnabled && (
            <Notice>El envío está pendiente de configurar en WhatsApp Business.</Notice>
          )}
          <form
            className="form-stack"
            onSubmit={submit}
            key={`${settings.data.enabled}-${settings.data.leadHours}`}
          >
            <Field label="Horas de antelación" htmlFor="reminder-hours">
              <input
                id="reminder-hours"
                name="hours"
                type="number"
                min={1}
                max={168}
                step={1}
                required
                defaultValue={settings.data.leadHours}
              />
            </Field>
            <label className="checkbox-line">
              <input
                name="enabled"
                type="checkbox"
                disabled={!settings.data.providerEnabled}
                defaultChecked={settings.data.enabled && settings.data.providerEnabled}
              />
              Activar recordatorios automáticos
            </label>
            <Button type="submit" disabled={save.isPending}>
              Guardar recordatorios
            </Button>
          </form>
          {settings.data.attempts.length > 0 && (
            <>
              <h3>Últimos intentos</h3>
              <ul>
                {settings.data.attempts.map((attempt) => (
                  <li key={`${attempt.appointmentId}-${attempt.startsAt}`}>
                    {attempt.startsAt.slice(0, 10).split('-').reverse().join('/')} ·{' '}
                    {attempt.startsAt.slice(11, 16)}
                    {' · '}
                    {labels[attempt.status] ?? attempt.status}
                    {attempt.httpStatus && attempt.httpStatus >= 400
                      ? ` (${attempt.httpStatus})`
                      : ''}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {save.isError && <Notice error>No se pudo guardar la configuración.</Notice>}
      {save.isSuccess && <Notice>Configuración guardada.</Notice>}
    </section>
  );
}
