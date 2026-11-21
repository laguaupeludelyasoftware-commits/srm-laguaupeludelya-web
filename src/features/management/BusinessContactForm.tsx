import { SettingsSection } from './SettingsSection';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { usePublicBusiness } from '../../data/public-business';
import { ownerToken } from './OwnerAccess';

/** Guarda el contacto comercial en la API y actualiza la consulta pública de la landing. */
export function BusinessContactForm() {
  const business = usePublicBusiness();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const contact = business.data?.contact;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    setMessage('');
    setPending(true);
    try {
      const response = await fetch('/api/management/contact', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${ownerToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: String(data.get('phone')).trim(),
          address: String(data.get('address')).trim(),
        }),
      });
      if (response.status === 401 || response.status === 403) {
        setError('La sesión ya no tiene acceso. Vuelve a iniciar sesión.');
        return;
      }
      if (response.status === 400) {
        setError('Revisa el teléfono y la dirección.');
        return;
      }
      if (!response.ok) throw new Error();
      await queryClient.invalidateQueries({ queryKey: ['public-business'] });
      setMessage('Contacto publicado en la web.');
    } catch {
      setError('No se pudo guardar el contacto. Vuelve a intentarlo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSection title="Contacto de la web">
      {business.isPending && <p role="status">Cargando datos de contacto…</p>}
      {business.isError && <Notice error>No se pudo consultar el contacto.</Notice>}
      {business.isSuccess && (
        <form className="form-stack" onSubmit={save} key={JSON.stringify(contact)}>
          <Field label="Teléfono" htmlFor="business-phone">
            <input
              id="business-phone"
              name="phone"
              type="tel"
              defaultValue={contact?.phone}
              maxLength={16}
              required
            />
          </Field>
          <Field label="Dirección" htmlFor="business-address">
            <input
              id="business-address"
              name="address"
              defaultValue={contact?.address}
              maxLength={255}
              required
            />
          </Field>
          {error && <Notice error>{error}</Notice>}
          {message && <Notice>{message}</Notice>}
          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando…' : 'Publicar contacto'}
          </Button>
        </form>
      )}
    </SettingsSection>
  );
}
