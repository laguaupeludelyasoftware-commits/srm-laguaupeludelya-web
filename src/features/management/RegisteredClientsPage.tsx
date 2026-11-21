import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
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
  email: string | null;
  emailVerified: boolean;
  phone?: string;
  hasAccount?: boolean;
  inPersonValidated: boolean;
}

/** Directorio de clientes con cuenta web o ficha presencial. */
export function RegisteredClientsPage() {
  const token = ownerToken();
  const [search, setSearch] = useState('');
  const [params] = useSearchParams();
  const selectedId = params.get('cliente');
  const petId = params.get('mascota');
  const queryClient = useQueryClient();
  const clientsKey = ['registered-clients', token];
  const clients = useQuery({
    queryKey: clientsKey,
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
  const validation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await fetch(
        `/api/management/clients/${encodeURIComponent(clientId)}/in-person-validation`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error();
    },
    onSuccess: (_, clientId) =>
      queryClient.setQueryData<RegisteredClient[]>(clientsKey, (current) =>
        current?.map((client) =>
          client.id === clientId ? { ...client, inPersonValidated: true } : client,
        ),
      ),
  });
  const selected = clients.data?.find((client) => client.id === selectedId);
  const filter = search.trim().toLocaleLowerCase('es');
  const matching = clients.data?.filter((client) =>
    `${client.name} ${client.email ?? ''} ${client.phone ?? ''}`
      .toLocaleLowerCase('es')
      .includes(filter),
  );

  return (
    <>
      <PageHeading
        eyebrow="CLIENTES Y MASCOTAS"
        title={selected?.name ?? 'Clientes'}
        description={
          selected
            ? (selected.email ?? 'Ficha presencial sin cuenta web.')
            : 'Consulta las fichas de clientes y sus mascotas.'
        }
      />
      <div className="management-stack">
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
            <nav className="choice-row" aria-label="Navegación de fichas">
              <Link className="inline-link" to="/gestion/clientes">
                Volver a clientes
              </Link>
              {petId && (
                <Link className="inline-link" to={`?cliente=${encodeURIComponent(selected.id)}`}>
                  Volver a la ficha de {selected.name}
                </Link>
              )}
            </nav>
            {petId ? (
              <>
                <ClientPets
                  key={petId}
                  token={token}
                  clientId={selected.id}
                  selectedPetId={petId}
                />
                <ManagementPetProfile
                  key={petId}
                  path={`/api/management/clients/${encodeURIComponent(selected.id)}/pets/${encodeURIComponent(petId)}`}
                />
              </>
            ) : (
              <>
                {selected.hasAccount !== false && (
                  <section
                    className="panel settings-panel client-validation"
                    aria-labelledby="booking-validation"
                  >
                    <h2 className="client-card-heading" id="booking-validation">
                      <ShieldCheck aria-hidden="true" />
                      Validación presencial
                    </h2>
                    <p role="status">
                      {selected.inPersonValidated
                        ? 'Cuenta validada. Puede reservar más de una cita futura.'
                        : 'Pendiente de validar. El límite inicial es de una cita futura.'}
                    </p>
                    {validation.isError && validation.variables === selected.id && (
                      <Notice error>No se pudo validar la cuenta. Vuelve a intentarlo.</Notice>
                    )}
                    {!selected.inPersonValidated && (
                      <Button
                        type="button"
                        disabled={validation.isPending}
                        onClick={() => validation.mutate(selected.id)}
                      >
                        {validation.isPending ? 'Validando…' : 'Validar cliente'}
                      </Button>
                    )}
                  </section>
                )}
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
            <Field label="Buscar por nombre, teléfono o correo" htmlFor="registered-client-search">
              <input
                id="registered-client-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
            {matching?.length === 0 && (
              <EmptyState
                title={filter ? 'No hay coincidencias' : 'Todavía no hay fichas de clientes'}
              >
                {filter
                  ? 'Prueba con otro nombre, teléfono o correo.'
                  : 'Las fichas aparecerán aquí cuando el cliente se registre o lo añadas desde Nueva cita.'}
              </EmptyState>
            )}
            <div className="catalog-grid">
              {matching?.map((client) => (
                <article className="panel catalog-card client-directory-card" key={client.id}>
                  <h2 className="client-card-heading">
                    <UserRound aria-hidden="true" />
                    {client.name}
                  </h2>
                  <div className="client-card-contact">
                    {client.email && (
                      <p>
                        <Mail aria-hidden="true" />{' '}
                        <span>
                          {client.email}{' '}
                          <small>
                            {client.emailVerified
                              ? 'Correo verificado'
                              : 'Correo pendiente de verificar'}
                          </small>
                        </span>
                      </p>
                    )}
                    {client.phone && (
                      <p>
                        <Phone aria-hidden="true" /> {client.phone}
                      </p>
                    )}
                  </div>
                  <div className="client-card-status">
                    <span className={`badge ${client.inPersonValidated ? 'badge-attended' : ''}`}>
                      {client.hasAccount === false
                        ? 'Sin cuenta web'
                        : client.inPersonValidated
                          ? 'Cuenta validada'
                          : 'Pendiente de validación presencial'}
                    </span>
                  </div>
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
      </div>
    </>
  );
}
