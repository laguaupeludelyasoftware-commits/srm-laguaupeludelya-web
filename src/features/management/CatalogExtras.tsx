import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { CatalogWorkspace } from './CatalogWorkspace';
import { euros } from '../../domain/rules';
import type { Extra } from '../booking/BookingExtras';
import { ownerRequest } from './OwnerAccess';

const path = '/api/management/extras';
const extrasKey = ['owner-catalog-extras'];

export function useCatalogExtras(enabled = true) {
  return useQuery({
    queryKey: extrasKey,
    enabled,
    queryFn: async ({ signal }): Promise<Extra[]> => (await ownerRequest(path, { signal })).json(),
  });
}

export function CatalogExtras({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Extra | 'new'>();
  const current = typeof editing === 'object' ? editing : undefined;
  const extras = useCatalogExtras();
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
      await Promise.all(
        [extrasKey, ['booking-quote'], ['owner-availability'], ['online-booking-slots']].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      );
      setEditing(undefined);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate(new FormData(event.currentTarget));
  }

  return (
    <CatalogWorkspace
      title={editing === 'new' ? 'Nuevo extra' : current ? 'Editar extra' : 'Catálogo de extras'}
      description="Puedes asignar un extra a varios servicios."
      onBack={onClose}
      busy={save.isPending}
    >
      {!editing && (
        <div className="form-stack">
          <div className="catalog-extra-actions">
            <Button
              type="button"
              onClick={() => {
                save.reset();
                setEditing('new');
              }}
            >
              <Plus size={17} aria-hidden="true" /> Nuevo extra
            </Button>
          </div>
          {extras.isPending && <p role="status">Cargando extras…</p>}
          {extras.isError && <Notice error>No se pudieron consultar los extras.</Notice>}
          {extras.data?.length === 0 && <p>Aún no hay extras en el catálogo.</p>}
          {extras.data?.map((extra) => (
            <div className="catalog-option-row" key={extra.id}>
              <div>
                <strong>{extra.name}</strong>
                <p>
                  {euros(extra.price)} · +{extra.duration} min
                </p>
              </div>
              <div className="catalog-extra-actions">
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
                <span className={`badge ${extra.active ? 'badge-attended' : 'badge-cancelled'}`}>
                  {extra.active ? 'Publicado' : 'Sin publicar'}
                </span>
              </div>
            </div>
          ))}
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
    </CatalogWorkspace>
  );
}
