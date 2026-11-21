import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export const sessionKey = 'guaupelu-client-session';

export function getClientToken() {
  return sessionStorage.getItem(sessionKey);
}

export function useClientLogout() {
  const navigate = useNavigate();
  return () => {
    sessionStorage.removeItem(sessionKey);
    navigate('/iniciar-sesion', { replace: true });
  };
}

interface ClientProfile {
  name: string;
  email: string;
  emailVerified: boolean;
}

/** Comprueba la sesión y lee los datos de la cuenta autenticada. */
export function useClientProfile(token: string | null) {
  return useQuery({
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
}
