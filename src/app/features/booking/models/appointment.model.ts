import { PhoneNumber } from './phone-number.model';
import { AppointmentStatus } from './appointment-status.enum';

export interface Appointment {
  id: string;
  storeId: string;
  professionalId: string;
  serviceId: string;
  customerName: string;
  customerWhatsApp: PhoneNumber;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  cancelToken?: string | null;
  cancelTokenUsed: boolean;
  createdAt: string;
}
