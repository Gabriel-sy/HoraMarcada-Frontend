import { PhoneNumber } from './phone-number.model';
import { Email } from './email.model';
import { WeeklyHours } from './weekly-hours.model';

export interface Professional {
  id: string;
  storeId: string;
  name: string;
  photoUrl?: string | null;
  whatsApp?: PhoneNumber | null;
  email?: Email | null;
  active: boolean;
  createdAt: string;
  weeklySchedules?: WeeklyHours[];
}
