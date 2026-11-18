import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Field, Notice } from '../../components/ui';

const sessionKey = 'guaupelu-owner-session';

/** Recupera el token de gestión de la pestaña que inició sesión. */
export function ownerToken() {
  return sessionStorage.getItem(sessionKey);
}

/** El backend comprueba tanto la vigencia del token como el rol actual de la cuenta. */
export async function checkOwnerSession(token: string, signal?: AbortSignal) {
  const response = await fetch('/api/management/session', {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (response.status === 401 || response.status === 403) return false;
  if (response.status !== 204) throw new Error('No se pudo comprobar la sesión.');
  return true;
}

/** Cierra la sesión de gestión de esta pestaña. */
export function OwnerLogout() {
  const navigate = useNavigate();
  return (
    <Button
      type="button"
      onClick={() => {
        sessionStorage.removeItem(sessionKey);
        navigate('/acceso-gestion', { replace: true });
      }}
    >
      Cerrar sesión
    </Button>
  );
}

/** Protege la entrada directa y vuelve a consultar el permiso al cambiar de sección. */
export function RequireOwner({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const token = ownerToken();
  const session = useQuery({
    queryKey: ['sesion-gestion', pathname, token],
    queryFn: ({ signal }) => checkOwnerSession(token ?? '', signal),
    enabled: !!token,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (!token || session.data === false) {
    return <Navigate to="/acceso-gestion" replace state={{ from: pathname }} />;
  }
  if (session.isError) {
    return (
      <main className="container section" id="main-content">
        <Notice error>No se pudo comprobar la sesión de gestión.</Notice>
        <Button type="button" onClick={() => void session.refetch()}>
          Reintentar
        </Button>
      </main>
    );
  }
  if (session.isPending || session.isFetching) {
    return (
      <main className="container section" id="main-content" role="status">
        Comprobando sesión…
      </main>
    );
  }
  return children;
}

/** Solicita las credenciales y abre el panel después de verificar el permiso en la API. */
export function OwnerAccess() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: String(data.get('nickname')).trim(),
          password: data.get('password'),
        }),
      });
      if (response.status === 401 || response.status === 403) {
        setMessage('El usuario o la contraseña no son correctos.');
        return;
      }
      if (!response.ok) throw new Error('No se pudo iniciar sesión.');
      const { token } = await response.json();
      if (!(await checkOwnerSession(token))) {
        setMessage('Esta cuenta no tiene acceso al panel de gestión.');
        return;
      }
      sessionStorage.setItem(sessionKey, token);
      const from = state?.from;
      navigate(typeof from === 'string' && /^\/gestion(?:\/|$)/.test(from) ? from : '/gestion', {
        replace: true,
      });
    } catch {
      setMessage('No se pudo abrir el panel. Vuelve a intentarlo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="container section" id="main-content">
      <Link className="brand" to="/" aria-label="La Guaupelu de Lya, inicio">
        <img src="/logo.jpeg" alt="" />
        <span>
          La Guaupelu <i>de Lya</i>
        </span>
      </Link>
      <form className="panel settings-panel" onSubmit={submit}>
        <h1>Acceso de gestión</h1>
        <Field label="Usuario" htmlFor="owner-nickname">
          <input id="owner-nickname" name="nickname" autoComplete="username" required />
        </Field>
        <Field label="Contraseña" htmlFor="owner-password">
          <input
            id="owner-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        {message && <Notice error>{message}</Notice>}
        <Button type="submit" disabled={pending}>
          {pending ? 'Comprobando…' : 'Entrar'}
        </Button>
      </form>
    </main>
  );
}
