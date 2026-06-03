export interface CustomerListDto {
  id: string;
  storeId: string;
  name: string;
  whatsApp: string;
  email: string | null;
  totalAppointments: number;
  lastVisit: string | null;
  createdAt: string;
}

export interface CustomerDetailDto {
  id: string;
  storeId: string;
  name: string;
  whatsApp: string;
  email: string | null;
  createdAt: string;
  appointmentHistory: CustomerAppointmentHistoryDto[];
}

export interface CustomerAppointmentHistoryDto {
  id: string;
  serviceName: string;
  price: number | null;
  professionalName: string;
  startTime: string;
  status: string;
}

export interface UpdateCustomerInput {
  name: string;
  whatsApp: string;
  email: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
