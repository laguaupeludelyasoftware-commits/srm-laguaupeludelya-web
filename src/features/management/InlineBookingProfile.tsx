import { useState, type FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { PetFields, readPetFields, type PetDetails } from '../customer/PetForm';
import { ownerRequest } from './OwnerAccess';

export type BookingClient = {
  id: string;
  name: string;
  email: string | null;
  phone?: string;
  hasAccount?: boolean;
};
export type BookingPet = PetDetails & { id: string };

export function InlineBookingProfile({
  clientId,
  saving,
  setSaving,
  onBack,
  onSaved,
}: {
  clientId?: string;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onBack: () => void;
  onSaved: (pet: BookingPet, client?: BookingClient) => void;
}) {
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const pet = readPetFields(form);
    const data = new FormData(form);
    setSaving(true);
    setError('');
    try {
      const response = await ownerRequest(
        clientId
          ? `/api/management/clients/${encodeURIComponent(clientId)}/pets`
          : '/api/management/clients',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            clientId
              ? pet
              : {
                  name: String(data.get('clientName')).trim(),
                  phone: String(data.get('clientPhone')).trim(),
                  pet,
                },
          ),
        },
      );
      if (clientId) {
        onSaved((await response.json()) as BookingPet);
      } else {
        const created: { client: BookingClient; pet: BookingPet } = await response.json();
        onSaved(created.pet, created.client);
      }
    } catch {
      setError('No se pudo guardar la ficha. Revisa el nombre y los datos de la mascota.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={save}>
      <fieldset className="form-stack" disabled={saving}>
        {!clientId && (
          <>
            <legend>Nueva ficha presencial</legend>
            <p>La ficha se guardará en el directorio sin crear una cuenta web.</p>
            <Field label="Nombre del cliente" htmlFor="inline-client-name">
              <input id="inline-client-name" name="clientName" maxLength={100} required />
            </Field>
            <Field label="Teléfono de contacto (opcional)" htmlFor="inline-client-phone">
              <input id="inline-client-phone" name="clientPhone" type="tel" maxLength={32} />
            </Field>
          </>
        )}
        <fieldset className="form-stack">
          <legend>Nueva mascota</legend>
          <PetFields species={['Perro', 'Gato']} />
        </fieldset>
        {error && <Notice error>{error}</Notice>}
        <div className="dialog-actions">
          <Button type="submit">
            {saving ? 'Guardando…' : clientId ? 'Guardar mascota' : 'Guardar ficha y mascota'}
          </Button>
          <Button type="button" variant="outline" onClick={onBack}>
            Volver a la cita
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
