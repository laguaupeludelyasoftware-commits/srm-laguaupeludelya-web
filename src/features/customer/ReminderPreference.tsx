import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';

type Preference = { phone: string; optedIn: boolean };
const path = '/api/auth/client/whatsapp-reminders';

export function ReminderPreference({ token }: { token: string }) {
  const client = useQueryClient();
  const key = ['whatsapp-reminder-preference', token];
  const preference = useQuery({
    queryKey: key,
    gcTime: 0,
    queryFn: async ({ signal }): Promise<Preference> => {
      const response = await fetch(path, { signal, headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error();
      return response.json();
    },
  });
  const save = useMutation({
    mutationFn: async (value: Preference): Promise<Preference> => {
      const response = await fetch(path, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      if (response.status === 400)
        throw new Error('Introduce un teléfono válido para activar los avisos.');
      if (!response.ok) throw new Error('No se pudieron guardar tus preferencias.');
      return response.json();
    },
    onSuccess: (value) => client.setQueryData(key, value),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    save.mutate({ phone: String(data.get('phone') ?? ''), optedIn: data.has('optedIn') });
  }

  return (
    <section className="panel settings-panel">
      <h2>Recordatorios por WhatsApp</h2>
      {preference.isPending && <p role="status">Cargando preferencias…</p>}
      {preference.isError && <Notice error>No se pudieron consultar tus preferencias.</Notice>}
      {preference.data && (
        <form
          className="form-stack"
          onSubmit={submit}
          key={`${preference.data.phone}-${preference.data.optedIn}`}
        >
          <Field
            label="Teléfono para recordatorios"
            htmlFor="reminder-phone"
            hint="Si tu número no es español, incluye el prefijo internacional."
          >
            <input
              id="reminder-phone"
              name="phone"
              type="tel"
              maxLength={32}
              defaultValue={preference.data.phone ? `+${preference.data.phone}` : ''}
            />
          </Field>
          <label className="checkbox-line">
            <input type="checkbox" name="optedIn" defaultChecked={preference.data.optedIn} />
            Este es mi número y acepto recibir recordatorios de mis citas por WhatsApp.
          </label>
          <Button type="submit" disabled={save.isPending}>
            Guardar preferencias
          </Button>
        </form>
      )}
      {save.isError && <Notice error>{save.error.message}</Notice>}
      {save.isSuccess && <Notice>Preferencias guardadas.</Notice>}
    </section>
  );
}
