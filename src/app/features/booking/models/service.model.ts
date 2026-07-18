export interface Service {
  id: string;
  storeId: string;
  name: string;
  durationMinutes: number;
  price?: number | null;
  professionalIds: string[];
  active: boolean;
}
