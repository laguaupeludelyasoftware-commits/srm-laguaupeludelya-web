import { useState, type FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { ownerToken } from './OwnerAccess';

/** Cambia la contraseña de la dueña tras comprobar la confirmación. */
export function OwnerPasswordForm() {
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get('currentPassword'));
    const newPassword = String(data.get('newPassword'));
    const confirmation = String(data.get('confirmation'));
    setSaved(false);
    setError('');
    if (newPassword !== confirmation) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      setError('La contraseña nueva supera el límite de 72 bytes.');
      return;
    }

    setPending(true);
    try {
      const response = await fetch('/api/management/password', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${ownerToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmation }),
      });
      if (response.status === 204) {
        form.reset();
        setSaved(true);
        return;
      }
      switch (response.status) {
        case 400:
          setError('Revisa la contraseña nueva y su confirmación.');
          break;
        case 422:
          setError('La contraseña actual no es correcta.');
          break;
        case 401:
        case 403:
          setError('Vuelve a iniciar sesión para cambiar la contraseña.');
          break;
        case 409:
          setError(
            'La contraseña ha cambiado. Comprueba la contraseña actual y vuelve a intentarlo.',
          );
          break;
        default:
          setError('No se pudo cambiar la contraseña. Vuelve a intentarlo.');
      }
    } catch {
      setError('No se pudo cambiar la contraseña. Vuelve a intentarlo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel settings-panel">
      <h2>Cambiar contraseña</h2>
      <form className="form-stack" onSubmit={save}>
        <Field label="Contraseña actual" htmlFor="owner-current-password">
          <input
            id="owner-current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Field
          label="Nueva contraseña"
          htmlFor="owner-new-password"
          hint="Usa al menos 12 caracteres."
        >
          <input
            id="owner-new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
        </Field>
        <Field label="Repite la nueva contraseña" htmlFor="owner-confirm-password">
          <input
            id="owner-confirm-password"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
        </Field>
        {error && <Notice error>{error}</Notice>}
        {saved && <Notice>Contraseña actualizada.</Notice>}
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </section>
  );
}
