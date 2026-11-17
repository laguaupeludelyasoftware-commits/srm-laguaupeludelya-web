import { useState } from 'react';
import type { FormEvent } from 'react';
import { Clock3, Pencil, Plus, Scissors } from 'lucide-react';
import { PageHeading } from '../../components/layout';
import { Button, Field, Modal, Notice } from '../../components/ui';
import { useDemo } from '../../data/demo-store';
import type { Service, Species } from '../../domain/models';
import { euros } from '../../domain/rules';

/** Catálogo compartido: editarlo actualiza la landing y las nuevas reservas locales. */
export function CatalogPage() {
  const { state, update } = useDemo();
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const current = editing && editing !== 'new' ? editing : null;
  /** Guarda precio y duración base de ejemplo; no pretende implementar el motor tarifario definitivo. */
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim();
    const price = Number(data.get('price'));
    const duration = Number(data.get('duration'));
    const species = data.getAll('species') as Species[];
    if (!name || !species.length || price < 0 || duration < 15 || duration > 480) {
      setError('Añade un nombre, al menos una especie y una duración de 15 a 480 minutos.');
      return;
    }
    const service: Service = {
      id: current?.id ?? crypto.randomUUID(),
      name,
      description: String(data.get('description')).trim(),
      price,
      duration,
      species,
      active: data.get('active') === 'on',
    };
    update((draft) => {
      const index = draft.services.findIndex((s) => s.id === service.id);
      if (index >= 0) draft.services[index] = service;
      else draft.services.push(service);
    });
    setEditing(null);
    setMessage(
      'Catálogo guardado. Las citas existentes conservan su servicio, precio y duración originales.',
    );
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
      <div className="info-strip">
        <Scissors size={20} />
        <span>
          Precios base y duraciones de ejemplo. Las reglas por peso, raza y pelaje se definirán en
          la siguiente fase.
        </span>
      </div>
      <div className="catalog-grid">
        {state.services.map((s) => (
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
          </article>
        ))}
      </div>
      <Modal
        title={current ? 'Afinamos este cuidado' : 'Un nuevo cuidado'}
        description="Configuración de ejemplo compartida con la web pública."
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
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
              maxLength={80}
            />
          </Field>
          <Field label="Descripción" htmlFor="service-description">
            <textarea
              id="service-description"
              name="description"
              required
              defaultValue={current?.description}
              maxLength={300}
            />
          </Field>
          <div className="form-grid">
            <Field label="Precio base (€)" htmlFor="service-price">
              <input
                id="service-price"
                name="price"
                type="number"
                min="0"
                max="9999"
                step="0.5"
                required
                defaultValue={current?.price ?? 25}
              />
            </Field>
            <Field label="Duración (minutos)" htmlFor="service-duration">
              <input
                id="service-duration"
                name="duration"
                type="number"
                min="15"
                max="480"
                step="15"
                required
                defaultValue={current?.duration ?? 60}
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
            <input type="checkbox" name="active" defaultChecked={current?.active ?? true} />{' '}
            Publicar para nuevas reservas
          </label>
          <Button type="submit">Guardar servicio</Button>
        </form>
      </Modal>
    </>
  );
}
