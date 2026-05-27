import { Slug } from './slug.model';
import { PhoneNumber } from './phone-number.model';
import { Email } from './email.model';

export interface Store {
  id: string;
  userId: string;
  name: string;
  slug: Slug;
  logoUrl?: string | null;
  address?: string | null;
  addressLat?: number | null;
  addressLng?: number | null;
  whatsApp: PhoneNumber;
  email: Email;
  active: boolean;
  createdAt: string;
}
