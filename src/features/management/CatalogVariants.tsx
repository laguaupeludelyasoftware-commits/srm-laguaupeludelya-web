import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import type { Service } from '../../domain/models';
import { CatalogWorkspace } from './CatalogWorkspace';
import { euros } from '../../domain/rules';
import { coatOptions } from '../customer/PetForm';
import { ownerRequest } from './ManualBooking';

type Rule = {
  name: string;
  species: string | null;
  breed: string | null;
  coat: string | null;
  minWeight: number | null;
  maxWeight: number | null;
  priority: number;
  price: number;
  priceMax: number | null;
  duration: number;
  active: boolean;
};
type Variant = { id: string; rule: Rule };

export function CatalogVariants({ service, onClose }: { service: Service; onClose: () => void }) {
  const path = `/api/management/services/${encodeURIComponent(service.id)}/variants`;
  const [editing, setEditing] = useState<Variant | 'new' | 'example'>();
  const variants = useQuery({
    queryKey: ['catalog-variants', service.id],
    queryFn: async ({ signal }): Promise<Variant[]> =>
      (await ownerRequest(path, { signal })).json(),
  });
  const current = typeof editing === 'object' ? editing : undefined;
  const priority = Math.min(9999, (variants.data?.[0]?.rule.priority ?? 0) + 10);
  const example: Rule = {
    name: 'Ejemplo: pelo largo de 10 a menos de 25 kg',
    species: service.species[0] ?? null,
    breed: null,
    coat: 'Largo',
    minWeight: 10,
    maxWeight: 25,
    priority,
    price: 30,
    priceMax: 38,
    duration: 60,
    active: false,
  };
  const initial = current?.rule ?? (editing === 'example' ? example : undefined);
  const save = useMutation({
    mutationFn: async (rule: Rule) => {
      await ownerRequest(current ? `${path}/${encodeURIComponent(current.id)}` : path, {
        method: current ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
    },
    onSuccess: async () => {
      await variants.refetch();
      setEditing(undefined);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const optionalText = (name: string) => String(data.get(name) ?? '').trim() || null;
    const optionalNumber = (name: string) =>
      optionalText(name) === null ? null : Number(data.get(name));
    save.mutate({
      name: String(data.get('name')).trim(),
      species: data.get('species') === 'any' ? null : optionalText('species'),
      breed: optionalText('breed'),
      coat: data.get('coat') === 'any' ? null : optionalText('coat'),
      minWeight: optionalNumber('minWeight'),
      maxWeight: optionalNumber('maxWeight'),
      priority: Number(data.get('priority')),
      price: Number(data.get('price')),
      priceMax: optionalNumber('priceMax'),
      duration: Number(data.get('duration')),
      active: data.has('active'),
    });
  }

  return (
    <CatalogWorkspace
      title={`Ajustes por mascota · ${service.name}`}
      description="Cambia automáticamente el precio o la duración del servicio según el peso, la raza o el pelaje. Por ejemplo, un baño puede durar más para un perro de pelo largo."
      onBack={onClose}
      busy={save.isPending}
    >
      {variants.isPending && <p role="status">Cargando ajustes…</p>}
      {variants.isError && <Notice error>No se pudieron consultar los ajustes.</Notice>}
      {!editing ? (
        <div className="form-stack">
          {variants.data?.length === 0 && (
            <p>Las reservas usan ahora el precio y la duración base del servicio.</p>
          )}
          {variants.data?.map((variant) => (
            <div className="catalog-option-row" key={variant.id}>
              <div>
                <strong>{variant.rule.name}</strong>
                <p>
                  {euros(variant.rule.price)}
                  {variant.rule.priceMax != null && ` – ${euros(variant.rule.priceMax)}`}
                  {' · '}
                  {variant.rule.duration} min · Prioridad {variant.rule.priority} ·{' '}
                  {variant.rule.active ? 'Publicado' : 'Desactivado'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  save.reset();
                  setEditing(variant);
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
            Nuevo ajuste
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              save.reset();
              setEditing('example');
            }}
          >
            Cargar ejemplo
          </Button>
        </div>
      ) : (
        <form className="form-stack" onSubmit={submit} key={current?.id ?? String(editing)}>
          <Field label="Nombre del ajuste" htmlFor="variant-name">
            <input
              id="variant-name"
              name="name"
              maxLength={120}
              required
              defaultValue={initial?.name}
            />
          </Field>
          <div className="form-grid">
            <Field label="Especie" htmlFor="variant-species">
              <SelectField
                id="variant-species"
                name="species"
                defaultValue={initial?.species ?? 'any'}
                options={[
                  { value: 'any', label: 'Cualquiera admitida' },
                  ...service.species.map((species) => ({ value: species, label: species })),
                ]}
              />
            </Field>
            <Field label="Tipo de manto" htmlFor="variant-coat">
              <SelectField
                id="variant-coat"
                name="coat"
                defaultValue={initial?.coat ?? 'any'}
                options={[
                  { value: 'any', label: 'Cualquiera' },
                  ...coatOptions.map((coat) => ({ value: coat, label: coat })),
                ]}
              />
            </Field>
            <Field
              label="Raza"
              htmlFor="variant-breed"
              hint="En blanco se aplica a cualquier raza."
            >
              <input
                id="variant-breed"
                name="breed"
                maxLength={80}
                defaultValue={initial?.breed ?? ''}
              />
            </Field>
            <Field label="Prioridad" htmlFor="variant-priority">
              <input
                id="variant-priority"
                name="priority"
                type="number"
                min={1}
                max={9999}
                required
                defaultValue={initial?.priority ?? priority}
              />
            </Field>
            <Field label="Desde (kg, incluido)" htmlFor="variant-min-weight">
              <input
                id="variant-min-weight"
                name="minWeight"
                type="number"
                min="0.1"
                max="150"
                step="0.1"
                defaultValue={initial?.minWeight ?? ''}
              />
            </Field>
            <Field label="Hasta (kg, excluido)" htmlFor="variant-max-weight">
              <input
                id="variant-max-weight"
                name="maxWeight"
                type="number"
                min="0.1"
                max="150"
                step="0.1"
                defaultValue={initial?.maxWeight ?? ''}
              />
            </Field>
            <Field label="Precio (€)" htmlFor="variant-price">
              <input
                id="variant-price"
                name="price"
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                required
                defaultValue={initial?.price ?? service.price}
              />
            </Field>
            <Field
              label="Precio máximo (€)"
              htmlFor="variant-price-max"
              hint="Déjalo vacío para un precio único."
            >
              <input
                id="variant-price-max"
                name="priceMax"
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                defaultValue={initial?.priceMax ?? ''}
              />
            </Field>
            <Field label="Duración (minutos)" htmlFor="variant-duration">
              <input
                id="variant-duration"
                name="duration"
                type="number"
                min="1"
                max="1440"
                required
                defaultValue={initial?.duration ?? Math.min(service.duration, 1440)}
              />
            </Field>
          </div>
          <label className="checkbox-line">
            <input type="checkbox" name="active" defaultChecked={initial?.active ?? false} />{' '}
            Publicar ajuste
          </label>
          {save.isError && (
            <Notice error>
              No se pudo guardar el ajuste. Revisa los límites, el precio y que la prioridad sea
              única.
            </Notice>
          )}
          <Button type="submit" disabled={save.isPending}>
            Guardar ajuste
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={() => setEditing(undefined)}
          >
            Volver a ajustes
          </Button>
        </form>
      )}
    </CatalogWorkspace>
  );
}
