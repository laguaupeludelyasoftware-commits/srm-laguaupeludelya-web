import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Pencil, Plus, Scissors } from 'lucide-react';
import { PageHeading } from '../../components/layout';
import { Button, Field, Modal, Notice } from '../../components/ui';
import type { Service, Species } from '../../domain/models';
import { euros } from '../../domain/rules';
import { ownerToken } from './OwnerAccess';
import { CatalogExtras } from './CatalogExtras';
import { CatalogVariants } from './CatalogVariants';

const catalogUrl = '/api/management/services';
const catalogKey = ['owner-catalog'];

/** Catálogo de gestión que publica los servicios disponibles en la web. */
export function CatalogPage() {
  const queryClient = useQueryClient();
  const catalog = useQuery({
    queryKey: catalogKey,
    queryFn: async ({ signal }): Promise<Service[]> => {
      const response = await fetch(catalogUrl, {
        headers: { Authorization: `Bearer ${ownerToken()}` },
        signal,
      });
      if (!response.ok) throw new Error('No se pudo consultar el catálogo.');
      return response.json();
    },
  });
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [extrasService, setExtrasService] = useState<Service | null>(null);
  const [variantService, setVariantService] = useState<Service | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const current = editing && editing !== 'new' ? editing : null;
  /** Guarda el servicio y actualiza las consultas del panel y de la web. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim();
    const price = Number(data.get('price'));
    const duration = Number(data.get('duration'));
    const species = data.getAll('species') as Species[];
    if (!name || !species.length || !Number.isInteger(duration) || duration < 1) {
      setError('Añade un nombre, al menos una especie y una duración válida.');
      return;
    }
    const service: Omit<Service, 'id'> = {
      name,
      description: String(data.get('description')).trim(),
      price,
      duration,
      species,
      active: data.get('active') === 'on',
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
      ]);
      setEditing(null);
      setMessage('Servicio guardado.');
    } catch {
      setError('No se pudo guardar el servicio. Vuelve a intentarlo.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="CADA MANTO, SU CUIDADO"
        title="Servicios con tu sello."
        description="Lo que ofreces y cómo lo cuentas, en un mismo lugar."
        action={
          <Button
            onClick={() => {
              setError('');
              setEditing('new');
            }}
          >
            <Plus size={17} /> Nuevo servicio
          </Button>
        }
      />
      {message && <Notice>{message}</Notice>}
      {catalog.isPending && <p role="status">Cargando servicios…</p>}
      {catalog.isError && <Notice error>No se pudo consultar el catálogo.</Notice>}
      {catalog.data?.length === 0 && (
        <p>Aún no hay servicios. Añade el primero para preparar el catálogo.</p>
      )}
      <div className="catalog-grid">
        {catalog.data?.map((s) => (
          <article className="panel catalog-card" key={s.id}>
            <div className="section-bar">
              <span className="service-icon">
                <Scissors size={23} strokeWidth={1.3} />
              </span>
              <span className={`badge ${s.active ? 'badge-attended' : 'badge-cancelled'}`}>
                {s.active ? 'Publicado' : 'Desactivado'}
              </span>
            </div>
            <h2>{s.name}</h2>
            <p className="muted">{s.description}</p>
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
            <Button
              variant="outline"
              onClick={() => {
                setError('');
                setEditing(s);
              }}
            >
              <Pencil size={15} /> Editar servicio
            </Button>
            <Button variant="outline" onClick={() => setExtrasService(s)}>
              Gestionar extras
            </Button>
            <Button variant="outline" onClick={() => setVariantService(s)}>
              Gestionar variantes
            </Button>
          </article>
        ))}
      </div>
      {extrasService && (
        <CatalogExtras service={extrasService} onClose={() => setExtrasService(null)} />
      )}
      {variantService && (
        <CatalogVariants service={variantService} onClose={() => setVariantService(null)} />
      )}
      <Modal
        title={current ? 'Afinamos este cuidado' : 'Un nuevo cuidado'}
        description="Los servicios publicados aparecen en la web y en el formulario de reserva."
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && !saving) setEditing(null);
        }}
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
          <label className="checkbox-line">
            <input type="checkbox" name="active" defaultChecked={current?.active ?? false} />{' '}
            Publicar para nuevas reservas
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar servicio'}
          </Button>
        </form>
      </Modal>
    </>
  );
}
