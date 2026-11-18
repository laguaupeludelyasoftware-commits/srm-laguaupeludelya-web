import { useQuery } from '@tanstack/react-query';
import type { Service } from '../domain/models';

interface PublicBusiness {
  contact: { phone: string; address: string } | null;
  services: Omit<Service, 'active'>[];
}

/** Comparte la consulta del catálogo publicado entre la landing y su enlace de reserva. */
export function usePublicBusiness(enabled = true) {
  return useQuery({
    queryKey: ['public-business'],
    enabled,
    queryFn: async ({ signal }): Promise<PublicBusiness> => {
      const response = await fetch('/api/public/business', { signal });
      if (!response.ok) {
        throw new Error('No se pudieron consultar los datos del negocio.');
      }
      return response.json();
    },
  });
}
