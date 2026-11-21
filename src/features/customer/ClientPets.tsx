import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, Modal, Notice } from '../../components/ui';
import { PetFields, readPetFields, type PetDetails } from './PetForm';

type ClientPet = PetDetails & { id: string };
function petsPath(clientId?: string) {
  return clientId
    ? `/api/management/clients/${encodeURIComponent(clientId)}/pets`
    : '/api/auth/client/pets';
}

export function useClientPets(token: string, clientId?: string) {
  const petsUrl = petsPath(clientId);
  return useQuery({
    queryKey: ['client-pets', petsUrl, token],
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }): Promise<ClientPet[]> => {
      const response = await fetch(petsUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (!response.ok) throw new Error();
      return response.json();
    },
  });
}

/** Lista y modifica mascotas o muestra el alta inicial en la reserva. */
export function ClientPets({
  token,
  clientId,
  selectedPetId,
  onFirstPetSaved,
}: {
  token: string;
  clientId?: string;
  selectedPetId?: string;
  onFirstPetSaved?: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const petsUrl = petsPath(clientId);
  const queryKey = ['client-pets', petsUrl, token];
  const pets = useClientPets(token, clientId);
  const [editing, setEditing] = useState<ClientPet | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const current = editing && editing !== 'new' ? editing : undefined;

  function open(pet: ClientPet | 'new') {
    setMessage('');
    setError('');
    setEditing(pet);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const details = readPetFields(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        current ? `${petsUrl}/${encodeURIComponent(current.id)}` : petsUrl,
        {
          method: current ? 'PUT' : 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(details),
        },
      );
      if (response.status === 400) {
        setError('Revisa el nombre, la especie y el peso de la mascota.');
        return;
      }
      if (response.status === 401 || response.status === 403) {
        setError('Vuelve a iniciar sesión para guardar la mascota.');
        return;
      }
      if (!response.ok) throw new Error();
      const saved: ClientPet = await response.json();
      onFirstPetSaved?.(saved.id);
      queryClient.setQueryData<ClientPet[]>(queryKey, (previous) =>
        [...(previous ?? []).filter((pet) => pet.id !== saved.id), saved].sort((a, b) =>
          a.name.localeCompare(b.name, 'es'),
        ),
      );
      void queryClient.invalidateQueries({ queryKey });
      setEditing(null);
      setMessage(current ? 'Mascota actualizada.' : 'Mascota añadida.');
    } catch {
      setError('No se pudo guardar la mascota. Vuelve a intentarlo.');
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <form className="form-stack" onSubmit={save} key={current?.id ?? 'new'}>
      <PetFields species={['Perro', 'Gato']} pet={current} styledSelect={!!clientId} />
      {error && <Notice error>{error}</Notice>}
      <Button type="submit" disabled={saving}>
        {saving
          ? 'Guardando…'
          : onFirstPetSaved
            ? 'Guardar mascota y continuar'
            : 'Guardar mascota'}
      </Button>
    </form>
  );

  if (onFirstPetSaved) return form;

  return (
    <section className="customer-page">
      <div className="section-bar">
        <h2>{clientId ? 'Mascotas' : 'Mis mascotas'}</h2>
        {!selectedPetId && (
          <Button type="button" onClick={() => open('new')} disabled={!pets.isSuccess}>
            <Plus size={17} /> Añadir mascota
          </Button>
        )}
      </div>
      {message && <Notice>{message}</Notice>}
      {pets.isPending && <p role="status">Cargando tus mascotas…</p>}
      {pets.isError && (
        <>
          <Notice error>No se pudieron consultar tus mascotas.</Notice>
          <Button type="button" onClick={() => void pets.refetch()}>
            Reintentar
          </Button>
        </>
      )}
      {pets.data?.length === 0 && (
        <EmptyState title="Todavía no hay mascotas">
          Añade una mascota para guardar su ficha.
        </EmptyState>
      )}
      <div className="catalog-grid">
        {pets.data
          ?.filter((pet) => !selectedPetId || pet.id === selectedPetId)
          .map((pet) => (
            <article key={pet.id} className="panel catalog-card">
              <h3>{pet.name}</h3>
              <p>
                {pet.species} · {pet.weight.toLocaleString('es-ES')} kg · Pelaje: {pet.coat}
              </p>
              {pet.breed && <p>Raza: {pet.breed}</p>}
              {pet.notes && <p>{pet.notes}</p>}
              {clientId && !selectedPetId && (
                <Link
                  className="inline-link"
                  to={`?cliente=${encodeURIComponent(clientId)}&mascota=${encodeURIComponent(pet.id)}`}
                >
                  Ver ficha de {pet.name}
                </Link>
              )}
              <Button type="button" variant="outline" onClick={() => open(pet)}>
                <Pencil size={15} /> Editar a {pet.name}
              </Button>
            </article>
          ))}
      </div>
      <Modal
        title={current ? `Editar a ${current.name}` : 'Añadir mascota'}
        open={editing !== null}
        description={
          clientId
            ? 'Estos datos se guardarán en la ficha de la mascota.'
            : 'Estos datos se guardarán en tu cuenta.'
        }
        onOpenChange={(visible) => {
          if (!visible && !saving) setEditing(null);
        }}
      >
        {form}
      </Modal>
    </section>
  );
}
