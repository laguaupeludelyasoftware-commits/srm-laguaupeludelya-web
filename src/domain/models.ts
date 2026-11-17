/** Contratos de demostración. La API futura será la autoridad de permisos y disponibilidad. */
export type Species = 'Perro' | 'Gato';
export type AppointmentStatus = 'confirmed' | 'attended' | 'cancelled' | 'rejected' | 'absent';
export interface Client {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  validated: boolean;
  cancellations: number;
  reviewReason: string;
  validatedAt?: string;
}
export interface Pet {
  id: string;
  clientId: string;
  name: string;
  species: Species;
  breed: string;
  weight: number;
  coat: string;
  notes: string;
}
export interface Service {
  id: string;
  name: string;
  description: string;
  species: Species[];
  price: number;
  duration: number;
  active: boolean;
}
/** Fotografía del servicio reservado para que editar el catálogo no reescriba el pasado. */
export interface Appointment {
  id: string;
  clientId: string;
  petId: string;
  serviceId: string;
  serviceName: string;
  startsAt: string;
  duration: number;
  price: number;
  status: AppointmentStatus;
  reason: string;
  treatment: string;
}
export interface BusinessHours {
  day: number;
  label: string;
  enabled: boolean;
  start: string;
  end: string;
}
export interface Settings {
  cancellationHours: number;
  species: Species[];
  hours: BusinessHours[];
}
export interface DemoState {
  version: 1;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  appointments: Appointment[];
  settings: Settings;
  activeClientId: string;
}
