import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Field, Notice } from '../../components/ui';
import { ClientPets } from './ClientPets';

const sessionKey = 'guaupelu-client-session';

interface ClientProfile {
  name: string;
  email: string;
  emailVerified: boolean;
}

/** Registro y entrada de clientes mediante correo y contraseña. */
export function ClientAccess({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password'));
    if (register && new TextEncoder().encode(password).length > 72) {
      setError('La contraseña supera el límite de 72 bytes.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const response = await fetch(register ? '/api/auth/register' : '/api/auth/client/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: register ? String(data.get('name')).trim() : undefined,
          email: String(data.get('email')).trim(),
          password,
        }),
      });
      if (!response.ok) {
        const errors: Record<number, string> = register
          ? {
              400: 'Revisa el nombre, el correo y la contraseña.',
              401: 'El registro de clientes está cerrado en este momento.',
              403: 'El registro de clientes está cerrado en este momento.',
              409: 'Ya hay una cuenta con ese correo. Puedes iniciar sesión.',
            }
          : { 401: 'El correo o la contraseña no son correctos.' };
        setError(
          errors[response.status] ?? 'No se pudo completar la solicitud. Vuelve a intentarlo.',
        );
        return;
      }
      const { token } = await response.json();
      if (typeof token !== 'string' || !token) throw new Error();
      sessionStorage.setItem(sessionKey, token);
      navigate('/mi-espacio', { replace: true });
    } catch {
      setError('No se pudo completar la solicitud. Vuelve a intentarlo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="container access-page">
      <div className="access-intro">
        <span className="eyebrow">LA GUAUPELU DE LYA</span>
        <h1>Vuestro espacio</h1>
        <p>Accede a tu cuenta de cliente de la peluquería.</p>
      </div>
      <div className="panel access-panel">
        <h2>{register ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
        <form className="form-stack" onSubmit={submit}>
          {register && (
            <Field label="Tu nombre" htmlFor="client-name">
              <input id="client-name" name="name" autoComplete="name" maxLength={100} required />
            </Field>
          )}
          <Field label="Correo electrónico" htmlFor="client-email">
            <input
              id="client-email"
              name="email"
              type="email"
              autoComplete="username"
              maxLength={254}
              required
            />
          </Field>
          <Field
            label="Contraseña"
            htmlFor="client-password"
            hint={register ? 'Al menos 8 caracteres.' : undefined}
          >
            <input
              id="client-password"
              name="password"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={register ? 8 : undefined}
              required
            />
          </Field>
          {error && <Notice error>{error}</Notice>}
          <Button type="submit" disabled={pending}>
            {pending ? 'Un momento…' : register ? 'Crear cuenta' : 'Entrar'}
          </Button>
        </form>
        <Link className="inline-link" to={register ? '/iniciar-sesion' : '/registro'}>
          {register ? 'Ya tengo cuenta' : 'Crear una cuenta'}
        </Link>
      </div>
    </section>
  );
}

/** Lee el perfil de la cuenta autenticada. El prototipo de reservas tiene su propio recorrido. */
export function ClientAccount() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem(sessionKey);
  const profile = useQuery({
    queryKey: ['client-profile', token],
    enabled: !!token,
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }): Promise<ClientProfile | null> => {
      const response = await fetch('/api/auth/client/me', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw new Error();
      return response.json();
    },
  });
  if (!token || profile.data === null) return <Navigate to="/iniciar-sesion" replace />;

  return (
    <section className="container section">
      {profile.isPending && <p role="status">Cargando tu cuenta…</p>}
      {profile.isError && (
        <>
          <Notice error>No se pudo consultar tu cuenta.</Notice>
          <Button onClick={() => void profile.refetch()}>Reintentar</Button>
        </>
      )}
      {profile.data && (
        <>
          <div className="panel settings-panel">
            <h1>Hola, {profile.data.name}</h1>
            <p>{profile.data.email}</p>
            <p>
              {profile.data.emailVerified
                ? 'Correo verificado.'
                : 'Verificación de correo pendiente.'}
            </p>
            <Button
              onClick={() => {
                sessionStorage.removeItem(sessionKey);
                navigate('/iniciar-sesion', { replace: true });
              }}
            >
              Cerrar sesión
            </Button>
          </div>
          <ClientPets token={token} />
        </>
      )}
    </section>
  );
}
