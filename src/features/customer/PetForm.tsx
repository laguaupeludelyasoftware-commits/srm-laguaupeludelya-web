import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { useDemo } from '../../data/demo-store';
import type { Species } from '../../domain/models';

/** Alta de mascota ficticia; los campos definitivos se acordarán antes de la API. */
export function PetForm({ clientId, onSaved }: { clientId: string; onSaved: () => void }) {
  const { state, update } = useDemo();
  const [error, setError] = useState('');
  /** Normaliza el formulario y rechaza especies deshabilitadas y pesos no válidos. */
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim();
    const species = String(data.get('species')) as Species;
    const weight = Number(data.get('weight'));
    if (!name || !state.settings.species.includes(species) || weight <= 0 || weight > 150) {
      setError('Revisa nombre, especie y peso.');
      return;
    }
    update((draft) =>
      draft.pets.push({
        id: crypto.randomUUID(),
        clientId,
        name,
        species,
        weight,
        breed: String(data.get('breed')).trim(),
        coat: String(data.get('coat')),
        notes: String(data.get('notes')).trim(),
      }),
    );
    onSaved();
  }
  return (
    <form className="form-stack" onSubmit={save}>
      {error && <Notice error>{error}</Notice>}
      <Field label="¿Cómo se llama?" htmlFor="pet-name">
        <input id="pet-name" name="name" required maxLength={60} placeholder="Su nombre favorito" />
      </Field>
      <div className="form-grid">
        <Field label="Especie" htmlFor="pet-species">
          <select id="pet-species" name="species">
            {state.settings.species.map((s) => (
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
            placeholder="6"
          />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Raza (opcional)" htmlFor="pet-breed">
          <input id="pet-breed" name="breed" maxLength={80} placeholder="También vale mestizo" />
        </Field>
        <Field label="Pelaje" htmlFor="pet-coat">
          <select id="pet-coat" name="coat">
            <option>Corto</option>
            <option>Largo</option>
            <option>Rizado</option>
            <option>Duro</option>
            <option>No lo sé</option>
          </select>
        </Field>
      </div>
      <Field label="Algo que debamos saber (opcional)" htmlFor="pet-notes">
        <textarea
          id="pet-notes"
          name="notes"
          maxLength={500}
          placeholder="Comportamiento, alergias o qué le ayuda a estar tranquilo…"
        />
      </Field>
      <Button type="submit">Guardar mascota de ejemplo</Button>
    </form>
  );
}
