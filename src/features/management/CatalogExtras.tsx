import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button, Field, Modal, Notice } from '../../components/ui';
import { euros } from '../../domain/rules';
import type { Extra } from '../booking/BookingExtras';
import { ownerRequest } from './ManualBooking';

export function CatalogExtras({
  service,
  onClose,
}: {
  service: { id: string; name: string };
  onClose: () => void;
}) {
  const path = `/api/management/services/${encodeURIComponent(service.id)}/extras`;
  const [editing, setEditing] = useState<Extra | 'new'>();
  const current = typeof editing === 'object' ? editing : undefined;
  const extras = useQuery({
    queryKey: ['owner-service-extras', service.id],
    queryFn: async ({ signal }): Promise<Extra[]> => (await ownerRequest(path, { signal })).json(),
  });
  const save = useMutation({
    mutationFn: async (data: FormData) => {
      await ownerRequest(current ? `${path}/${encodeURIComponent(current.id)}` : path, {
        method: current ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name')).trim(),
          price: Number(data.get('price')),
          duration: Number(data.get('duration')),
          active: data.has('active'),
        }),
      });
    },
    onSuccess: async () => {
      await extras.refetch();
      setEditing(undefined);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate(new FormData(event.currentTarget));
  }

  return (
    <Modal
      open
      title={`Extras de ${service.name}`}
      description="Los extras publicados estarán disponibles al reservar este servicio."
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      {extras.isPending && <p role="status">Cargando extras…</p>}
      {extras.isError && <Notice error>No se pudieron consultar los extras.</Notice>}
      {extras.data?.length === 0 && <p>Este servicio aún no tiene extras.</p>}
      {!editing && (
        <div className="form-stack">
          {extras.data?.map((extra) => (
            <div className="section-bar" key={extra.id}>
              <div>
                <strong>{extra.name}</strong>
                <p>
                  {euros(extra.price)} · +{extra.duration} min ·{' '}
                  {extra.active ? 'Publicado' : 'Desactivado'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  save.reset();
                  setEditing(extra);
                }}
              >
                Editar
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={() => {
              save.reset();
              setEditing('new');
            }}
          >
            Nuevo extra
          </Button>
        </div>
      )}
      {editing && (
        <form className="form-stack" onSubmit={submit} key={current?.id ?? 'new'}>
          <Field label="Nombre del extra" htmlFor="extra-name">
            <input
              id="extra-name"
              name="name"
              maxLength={120}
              required
              defaultValue={current?.name}
            />
          </Field>
          <Field label="Precio adicional (€)" htmlFor="extra-price">
            <input
              id="extra-price"
              name="price"
              type="number"
              min="0"
              max="99999999.99"
              step="0.01"
              required
              defaultValue={current?.price ?? 0}
            />
          </Field>
          <Field label="Minutos adicionales" htmlFor="extra-duration">
            <input
              id="extra-duration"
              name="duration"
              type="number"
              min="0"
              max="720"
              step="1"
              required
              defaultValue={current?.duration ?? 0}
            />
          </Field>
          <label className="checkbox-line">
            <input type="checkbox" name="active" defaultChecked={current?.active ?? false} />{' '}
            Publicar extra
          </label>
          {save.isError && <Notice error>No se pudo guardar el extra.</Notice>}
          <Button type="submit" disabled={save.isPending}>
            Guardar extra
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={() => setEditing(undefined)}
          >
            Volver a extras
          </Button>
        </form>
      )}
    </Modal>
  );
}
