import { useQuery } from '@tanstack/react-query';
import type { Service } from '../domain/models';

export interface BusinessInterval {
  day: number;
  start: string;
  end: string;
}

export const businessDays = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

interface PublicBusiness {
  contact: { phone: string; address: string } | null;
  services: Omit<Service, 'active'>[];
  hours?: BusinessInterval[];
}

/** Comparte la consulta del catálogo publicado entre la landing y su enlace de reserva. */
export function usePublicBusiness() {
  return useQuery({
    queryKey: ['public-business'],
    queryFn: async ({ signal }): Promise<PublicBusiness> => {
      const response = await fetch('/api/public/business', { signal });
      if (!response.ok) {
        throw new Error('No se pudieron consultar los datos del negocio.');
      }
      return response.json();
    },
  });
}
