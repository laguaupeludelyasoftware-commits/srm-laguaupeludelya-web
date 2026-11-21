import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Pencil, Plus, Scissors, X } from 'lucide-react';
import { PageHeading } from '../../components/layout';
import { SelectField } from '../../components/SelectField';
import { Button, Field, Notice } from '../../components/ui';
import type { Service, Species } from '../../domain/models';
import { euros } from '../../domain/rules';
import { ownerToken } from './OwnerAccess';
import { CatalogExtras, useCatalogExtras } from './CatalogExtras';
import { CatalogVariants } from './CatalogVariants';
import { CatalogWorkspace } from './CatalogWorkspace';

const catalogUrl = '/api/management/services';
const catalogKey = ['owner-catalog'];
type ManagedService = Service & { extraIds?: string[] };

/** Catálogo de gestión que publica los servicios disponibles en la web. */
export function CatalogPage() {
  const queryClient = useQueryClient();
  const catalog = useQuery({
    queryKey: catalogKey,
    queryFn: async ({ signal }): Promise<ManagedService[]> => {
      const response = await fetch(catalogUrl, {
        headers: { Authorization: `Bearer ${ownerToken()}` },
        signal,
      });
      if (!response.ok) throw new Error('No se pudo consultar el catálogo.');
      return response.json();
    },
  });
  const [editing, setEditing] = useState<ManagedService | 'new' | null>(null);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [showExtras, setShowExtras] = useState(false);
  const [variantService, setVariantService] = useState<Service | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const current = editing && editing !== 'new' ? editing : null;
  const extras = useCatalogExtras(!!editing);
  const catalogExtras = extras.data ?? [];
  const extraOptions = catalogExtras
    .filter((extra) => !extraIds.includes(extra.id))
    .map((extra) => ({
      value: extra.id,
      label: `${extra.name} · ${euros(extra.price)} · +${extra.duration} min${extra.active ? '' : ' · Sin publicar'}`,
    }));
  const selectedExtras = catalogExtras.filter((extra) => extraIds.includes(extra.id));

  function openService(service: ManagedService | 'new') {
    setError('');
    setExtraIds(service === 'new' ? [] : (service.extraIds ?? []));
    setEditing(service);
  }

  /** Guarda el servicio y actualiza las consultas del panel y de la web. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!extras.isSuccess) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim();
    const price = Number(data.get('price'));
    const duration = Number(data.get('duration'));
    const species = data.getAll('species') as Species[];
    if (!name || !species.length || !Number.isInteger(duration) || duration < 1) {
      setError('Añade un nombre, al menos una especie y una duración válida.');
      return;
    }
    const service = {
      name,
      description: String(data.get('description')).trim(),
      price,
      duration,
      species,
      active: data.get('active') === 'on',
      extraIds,
    };
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(
        current ? `${catalogUrl}/${encodeURIComponent(current.id)}` : catalogUrl,
        {
          method: current ? 'PUT' : 'POST',
          headers: { Authorization: `Bearer ${ownerToken()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(service),
        },
      );
      if (response.status === 401 || response.status === 403) {
        setError('Vuelve a iniciar sesión para guardar el servicio.');
        return;
      }
      if (response.status === 400) {
        setError('Revisa el nombre, el precio, la duración y las especies.');
        return;
      }
      if (!response.ok) throw new Error();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: catalogKey }),
        queryClient.invalidateQueries({ queryKey: ['public-business'] }),
        queryClient.invalidateQueries({ queryKey: ['booking-quote'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['online-booking-slots'] }),
      ]);
      setEditing(null);
      setMessage('Servicio guardado.');
    } catch {
      setError('No se pudo guardar el servicio. Vuelve a intentarlo.');
    } finally {
      setSaving(false);
    }
  }
  if (showExtras) {
    return <CatalogExtras onClose={() => setShowExtras(false)} />;
  }
  if (variantService) {
    return <CatalogVariants service={variantService} onClose={() => setVariantService(null)} />;
  }
  if (editing) {
    return (
      <CatalogWorkspace
        title={current ? 'Editar servicio' : 'Nuevo servicio'}
        description="Los servicios publicados aparecen en la web y en el formulario de reserva."
        onBack={() => setEditing(null)}
        busy={saving}
      >
        <form className="form-stack" onSubmit={save} key={current?.id ?? 'new'}>
          {error && <Notice error>{error}</Notice>}
          <Field label="Nombre del servicio" htmlFor="service-name">
            <input
              id="service-name"
              name="name"
              required
              defaultValue={current?.name}
              maxLength={120}
            />
          </Field>
          <Field label="Descripción" htmlFor="service-description">
            <textarea
              id="service-description"
              name="description"
              defaultValue={current?.description}
              maxLength={1000}
            />
          </Field>
          <div className="form-grid">
            <Field label="Precio base (€)" htmlFor="service-price">
              <input
                id="service-price"
                name="price"
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                required
                defaultValue={current?.price}
              />
            </Field>
            <Field label="Duración (minutos)" htmlFor="service-duration">
              <input
                id="service-duration"
                name="duration"
                type="number"
                min="1"
                max="2147483647"
                step="1"
                required
                defaultValue={current?.duration}
              />
            </Field>
          </div>
          <fieldset>
            <legend>Especies atendidas</legend>
            <div className="choice-row">
              {(['Perro', 'Gato'] as const).map((sp) => (
                <label className="checkbox-line" key={sp}>
                  <input
                    type="checkbox"
                    name="species"
                    value={sp}
                    defaultChecked={current ? current.species.includes(sp) : sp === 'Perro'}
                  />
                  {sp}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Extras del servicio</legend>
            {extras.isPending && <p role="status">Cargando extras…</p>}
            {extras.isError && (
              <Notice error>
                No se pudieron consultar los extras.{' '}
                <Button type="button" variant="outline" onClick={() => void extras.refetch()}>
                  Reintentar
                </Button>
              </Notice>
            )}
            {extras.data?.length === 0 && <p>Puedes crear extras desde «Gestionar extras».</p>}
            {catalogExtras.length > 0 && (
              <Field label="Añadir extra" htmlFor="service-extra">
                <SelectField
                  id="service-extra"
                  value=""
                  placeholder={extraOptions.length ? 'Elige un extra' : 'Todos los extras añadidos'}
                  options={extraOptions}
                  disabled={saving}
                  onValueChange={(id) => setExtraIds((ids) => [...ids, id])}
                />
              </Field>
            )}
            {selectedExtras.length > 0 && (
              <ul className="catalog-selected-extras" aria-label="Extras añadidos">
                {selectedExtras.map((extra) => (
                  <li className="catalog-option-row" key={extra.id}>
                    <div>
                      <strong>{extra.name}</strong>
                      <p>
                        {euros(extra.price)} · +{extra.duration} min
                        {!extra.active && ' · Sin publicar'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Quitar ${extra.name}`}
                      disabled={saving}
                      onClick={() => setExtraIds((ids) => ids.filter((id) => id !== extra.id))}
                    >
                      <X size={16} aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
          <label className="checkbox-line">
            <input type="checkbox" name="active" defaultChecked={current?.active ?? false} />{' '}
            Publicar para nuevas reservas
          </label>
          <Button type="submit" disabled={saving || !extras.isSuccess}>
            {saving ? 'Guardando…' : 'Guardar servicio'}
          </Button>
        </form>
      </CatalogWorkspace>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="CADA MANTO, SU CUIDADO"
        title="Servicios con tu sello."
        description="Lo que ofreces y cómo lo cuentas, en un mismo lugar."
        action={
          <Button onClick={() => openService('new')}>
            <Plus size={17} /> Nuevo servicio
          </Button>
        }
      />
      <div className="catalog-extras-help">
        <p className="muted">
          Crea primero los extras. Después podrás añadirlos al crear o editar un servicio.
        </p>
        <Button variant="outline" onClick={() => setShowExtras(true)}>
          Gestionar extras
        </Button>
      </div>
      {message && <Notice>{message}</Notice>}
      {catalog.isPending && <p role="status">Cargando servicios…</p>}
      {catalog.isError && <Notice error>No se pudo consultar el catálogo.</Notice>}
      {catalog.data?.length === 0 && (
        <p>Aún no hay servicios. Añade el primero para preparar el catálogo.</p>
      )}
      <div className="catalog-grid service-catalog-grid">
        {catalog.data?.map((s) => (
          <article className="panel catalog-card" key={s.id}>
            <div className="section-bar">
              <span className="service-icon">
                <Scissors size={20} strokeWidth={1.3} aria-hidden="true" />
              </span>
              <span className={`badge ${s.active ? 'badge-attended' : 'badge-cancelled'}`}>
                {s.active ? 'Publicado' : 'Desactivado'}
              </span>
            </div>
            <h2 title={s.name}>{s.name}</h2>
            <p className="muted" title={s.description}>
              {s.description}
            </p>
            <div className="species-tags">
              {s.species.map((sp) => (
                <span className="soft-tag" key={sp}>
                  {sp}
                </span>
              ))}
            </div>
            <div className="catalog-price">
              <strong>
                {euros(s.price)}
                <small> orientativos</small>
              </strong>
              <span>
                <Clock3 size={14} /> {s.duration} min
              </span>
            </div>
            <div className="catalog-card-actions">
              <Button variant="outline" onClick={() => openService(s)}>
                <Pencil size={15} /> Editar servicio
              </Button>
              <Button variant="outline" onClick={() => setVariantService(s)}>
                Ajustes por mascota
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
