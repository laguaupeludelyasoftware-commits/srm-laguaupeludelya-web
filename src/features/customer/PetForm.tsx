import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { useDemo } from '../../data/demo-store';
import type { Pet, Species } from '../../domain/models';

export type PetDetails = Omit<Pet, 'id' | 'clientId'>;
export const coatOptions = ['Corto', 'Medio', 'Largo', 'Doble capa', 'Rizado', 'Duro', 'No lo sé'];

/** Lee los campos que comparten el alta real y el formulario de demostración. */
export function readPetFields(form: HTMLFormElement): PetDetails {
  const data = new FormData(form);
  return {
    name: String(data.get('name')).trim(),
    species: String(data.get('species')) as Species,
    weight: Number(data.get('weight')),
    breed: String(data.get('breed')).trim(),
    coat: String(data.get('coat')),
    notes: String(data.get('notes')).trim(),
  };
}

/** Alta de mascota ficticia; los campos definitivos se acordarán antes de la API. */
export function PetForm({ clientId, onSaved }: { clientId: string; onSaved: () => void }) {
  const { state, update } = useDemo();
  const [error, setError] = useState('');
  /** Normaliza el formulario y rechaza especies deshabilitadas y pesos no válidos. */
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pet = readPetFields(event.currentTarget);
    const { name, species, weight } = pet;
    if (!name || !state.settings.species.includes(species) || weight <= 0 || weight > 150) {
      setError('Revisa nombre, especie y peso.');
      return;
    }
    update((draft) =>
      draft.pets.push({
        id: crypto.randomUUID(),
        clientId,
        ...pet,
      }),
    );
    onSaved();
  }
  return (
    <form className="form-stack" onSubmit={save}>
      {error && <Notice error>{error}</Notice>}
      <PetFields species={state.settings.species} />
      <Button type="submit">Guardar mascota de ejemplo</Button>
    </form>
  );
}

/** Campos editables de la ficha de una mascota. */
export function PetFields({ species, pet }: { species: Species[]; pet?: PetDetails }) {
  return (
    <>
      <Field label="¿Cómo se llama?" htmlFor="pet-name">
        <input id="pet-name" name="name" required maxLength={60} defaultValue={pet?.name} />
      </Field>
      <div className="form-grid">
        <Field label="Especie" htmlFor="pet-species">
          <select id="pet-species" name="species" defaultValue={pet?.species}>
            {species.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Peso aproximado (kg)" htmlFor="pet-weight">
          <input
            id="pet-weight"
            name="weight"
            type="number"
            min="0.1"
            max="150"
            step="0.1"
            required
            defaultValue={pet?.weight}
            placeholder="6"
          />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Raza (opcional)" htmlFor="pet-breed">
          <input id="pet-breed" name="breed" maxLength={80} defaultValue={pet?.breed} />
        </Field>
        <Field label="Pelaje" htmlFor="pet-coat">
          <select id="pet-coat" name="coat" defaultValue={pet?.coat ?? 'No lo sé'}>
            {coatOptions.map((coat) => (
              <option key={coat}>{coat}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Algo que debamos saber (opcional)" htmlFor="pet-notes">
        <textarea
          id="pet-notes"
          name="notes"
          maxLength={500}
          defaultValue={pet?.notes}
          placeholder="Comportamiento, alergias o qué le ayuda a estar tranquilo…"
        />
      </Field>
    </>
  );
}
