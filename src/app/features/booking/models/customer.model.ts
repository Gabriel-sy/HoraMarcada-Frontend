export interface CustomerListDto {
  id: string;
  storeId: string;
  name: string;
  whatsApp: string;
  totalAppointments: number;
  lastVisit: string | null;
  createdAt: string;
}

export interface CustomerDetailDto {
  id: string;
  storeId: string;
  name: string;
  whatsApp: string;
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
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
