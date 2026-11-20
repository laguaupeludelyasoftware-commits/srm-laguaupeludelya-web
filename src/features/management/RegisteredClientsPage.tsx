import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeading } from '../../components/layout';
import { Button, EmptyState, Field, Notice } from '../../components/ui';
import { ClientPets } from '../customer/ClientPets';
import { ownerToken } from './OwnerAccess';
import { ManagementClientProfile, ManagementPetProfile } from './ManagementProfile';

interface RegisteredClient {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

/** Directorio de las cuentas de cliente y sus fichas persistidas. */
export function RegisteredClientsPage() {
  const token = ownerToken();
  const [search, setSearch] = useState('');
  const [params] = useSearchParams();
  const selectedId = params.get('cliente');
  const petId = params.get('mascota');
  const clients = useQuery({
    queryKey: ['registered-clients', token],
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }): Promise<RegisteredClient[]> => {
      const response = await fetch('/api/management/clients', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (!response.ok) throw new Error();
      return response.json();
    },
  });
  const selected = clients.data?.find((client) => client.id === selectedId);
  const filter = search.trim().toLocaleLowerCase('es');
  const matching = clients.data?.filter((client) =>
    `${client.name} ${client.email}`.toLocaleLowerCase('es').includes(filter),
  );

  return (
    <>
      <PageHeading
        eyebrow="CLIENTES Y MASCOTAS"
        title={selected?.name ?? 'Clientes registrados'}
        description={
          selected?.email ?? 'Consulta las cuentas registradas en la web y sus mascotas.'
        }
      />
      {clients.isPending && <p role="status">Cargando clientes…</p>}
      {clients.isError && (
        <>
          <Notice error>No se pudieron consultar los clientes.</Notice>
          <Button type="button" onClick={() => void clients.refetch()}>
            Reintentar
          </Button>
        </>
      )}
      {selected && token && (
        <>
          <Link className="inline-link" to="/gestion/clientes">
            Volver a clientes
          </Link>
          {petId ? (
            <>
              <Link className="inline-link" to={`?cliente=${encodeURIComponent(selected.id)}`}>
                Volver a la ficha de {selected.name}
              </Link>
              <ClientPets key={petId} token={token} clientId={selected.id} selectedPetId={petId} />
              <ManagementPetProfile
                key={petId}
                path={`/api/management/clients/${encodeURIComponent(selected.id)}/pets/${encodeURIComponent(petId)}`}
              />
            </>
          ) : (
            <>
              <ManagementClientProfile
                key={selected.id}
                path={`/api/management/clients/${encodeURIComponent(selected.id)}`}
                onSaved={() => {
                  void clients.refetch();
                }}
              />
              <ClientPets key={selected.id} token={token} clientId={selected.id} />
            </>
          )}
        </>
      )}
      {clients.isSuccess && !selected && (
        <>
          <Field label="Buscar por nombre o correo" htmlFor="registered-client-search">
            <input
              id="registered-client-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          {matching?.length === 0 && (
            <EmptyState
              title={filter ? 'No hay coincidencias' : 'Todavía no hay clientes registrados'}
            >
              {filter
                ? 'Prueba con otro nombre o correo.'
                : 'Las cuentas aparecerán aquí cuando se registren.'}
            </EmptyState>
          )}
          <div className="catalog-grid">
            {matching?.map((client) => (
              <article className="panel catalog-card" key={client.id}>
                <h2>{client.name}</h2>
                <p>{client.email}</p>
                <p>
                  {client.emailVerified ? 'Correo verificado' : 'Correo pendiente de verificar'}
                </p>
                <Button asChild variant="outline">
                  <Link to={`?cliente=${encodeURIComponent(client.id)}`}>
                    Ver ficha de {client.name}
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
