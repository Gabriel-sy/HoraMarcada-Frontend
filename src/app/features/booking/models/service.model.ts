import { Money } from './money.model';

export interface Service {
  id: string;
  storeId: string;
  name: string;
  durationMinutes: number;
  price?: Money | null;
  professionalIds: string[];
  active: boolean;
}
