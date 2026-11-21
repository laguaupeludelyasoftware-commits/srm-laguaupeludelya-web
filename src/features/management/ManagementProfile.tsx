import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { bookingPrice, statusLabels } from '../../domain/rules';
import { ownerRequest } from './ManualBooking';
import { WhatsAppContact } from './WhatsAppActions';
import { TreatmentSummary, type Treatment } from './TreatmentForm';

function ProfileForm<T>({
  path,
  title,
  fields,
  read,
  onSaved,
}: {
  path: string;
  title: string;
  fields: (value: T) => ReactNode;
  read: (data: FormData) => T;
  onSaved?: () => void;
}) {
  const profile = useQuery({
    queryKey: ['management-profile', path],
    gcTime: 0,
    queryFn: async ({ signal }): Promise<T> => (await ownerRequest(path, { signal })).json(),
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<'saved' | 'error'>();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setResult(undefined);
    try {
      await ownerRequest(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(read(new FormData(event.currentTarget))),
      });
      await profile.refetch();
      onSaved?.();
      setResult('saved');
    } catch {
      setResult('error');
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel settings-panel management-profile">
      <h2>{title}</h2>
      {profile.isPending && <p role="status">Cargando ficha…</p>}
      {profile.isError && <Notice error>No se pudo cargar la ficha.</Notice>}
      {profile.data && (
        <form className="form-stack management-profile-form" onSubmit={save}>
          {fields(profile.data)}
          <Button type="submit" disabled={saving}>
            Guardar ficha
          </Button>
        </form>
      )}
      {result === 'saved' && <Notice>Ficha guardada.</Notice>}
      {result === 'error' && <Notice error>No se pudo guardar la ficha.</Notice>}
    </section>
  );
}

export function ManagementClientProfile({ path, onSaved }: { path: string; onSaved: () => void }) {
  return (
    <ProfileForm<{ name: string; phone: string; notes: string }>
      path={path}
      title="Ficha del cliente"
      onSaved={onSaved}
      read={(data) => ({
        name: String(data.get('name')),
        phone: String(data.get('phone')),
        notes: String(data.get('notes')),
      })}
      fields={(value) => (
        <>
          <Field label="Nombre" htmlFor="profile-client-name">
            <input
              id="profile-client-name"
              name="name"
              defaultValue={value.name}
              maxLength={100}
              required
            />
          </Field>
          <Field label="Teléfono de contacto" htmlFor="profile-client-phone">
            <input
              id="profile-client-phone"
              name="phone"
              type="tel"
              defaultValue={value.phone}
              maxLength={32}
            />
          </Field>
          <WhatsAppContact phone={value.phone} />
          <Field label="Notas internas" htmlFor="profile-client-notes">
            <textarea
              id="profile-client-notes"
              name="notes"
              defaultValue={value.notes}
              maxLength={1000}
            />
          </Field>
        </>
      )}
    />
  );
}

type Visit = {
  treatment?: Treatment | null;
  variantName?: string | null;
  priceMax?: number | null;
  id: string;
  startsAt: string;
  serviceName: string;
  status: string;
  duration: number;
  price: number;
};
const historyLabels: Record<string, string> = {
  CONFIRMED: statusLabels.confirmed,
  ATTENDED: statusLabels.attended,
  ABSENT: statusLabels.absent,
  REJECTED: statusLabels.rejected,
  CANCELLED_ON_TIME: 'Cancelada en plazo',
  CANCELLED_LATE: 'Cancelada fuera de plazo',
};

export function ManagementPetProfile({ path }: { path: string }) {
  const history = useQuery({
    queryKey: ['management-pet-history', path],
    gcTime: 0,
    queryFn: async ({ signal }): Promise<Visit[]> =>
      (await ownerRequest(`${path}/history`, { signal })).json(),
  });
  return (
    <>
      <ProfileForm<{ ageMonths: number | null; healthNotes: string }>
        path={`${path}/details`}
        title="Edad y salud"
        read={(data) => ({
          ageMonths: data.get('age') === '' ? null : Number(data.get('age')),
          healthNotes: String(data.get('health')),
        })}
        fields={(value) => (
          <>
            <Field label="Edad aproximada (meses)" htmlFor="profile-pet-age">
              <input
                id="profile-pet-age"
                name="age"
                type="number"
                min={0}
                step={1}
                defaultValue={value.ageMonths ?? ''}
              />
            </Field>
            <Field label="Enfermedades y observaciones internas" htmlFor="profile-pet-health">
              <textarea
                id="profile-pet-health"
                name="health"
                defaultValue={value.healthNotes}
                maxLength={1000}
              />
            </Field>
          </>
        )}
      />
      <section className="panel settings-panel">
        <h2>Historial de citas</h2>
        {history.isPending && <p role="status">Cargando historial…</p>}
        {history.isError && <Notice error>No se pudo cargar el historial.</Notice>}
        {history.data?.length === 0 && <p>Esta mascota aún no tiene citas anteriores.</p>}
        {history.data?.length ? (
          <ul className="pet-visit-list">
            {history.data.map((visit) => (
              <li key={visit.id}>
                <div className="pet-visit-heading">
                  <strong>{visit.serviceName}</strong>
                  <span className={`badge ${visit.status === 'ATTENDED' ? 'badge-attended' : ''}`}>
                    {historyLabels[visit.status] ?? visit.status}
                  </span>
                </div>
                <p>
                  {visit.startsAt.slice(0, 10).split('-').reverse().join('/')} ·{' '}
                  {visit.startsAt.slice(11, 16)} · {visit.duration} min ·{' '}
                  {bookingPrice(visit.price, visit.priceMax)}
                </p>
                {visit.variantName && <p>Variante: {visit.variantName}</p>}
                {visit.status === 'ATTENDED' &&
                  (visit.treatment ? (
                    <TreatmentSummary treatment={visit.treatment} />
                  ) : (
                    <p>Sin tratamiento registrado.</p>
                  ))}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </>
  );
}
