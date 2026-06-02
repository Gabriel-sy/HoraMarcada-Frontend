export interface ServicePopularityDto {
  serviceName: string;
  count: number;
  revenue: number;
}

export interface ProfessionalOccupationDto {
  professionalName: string;
  count: number;
  totalMinutes: number;
}

export interface DailyAppointmentDto {
  date: string;
  count: number;
}

export interface StoreStatisticsResponse {
  estimatedRevenue: number;
  totalAppointments: number;
  mostPopularServices: ServicePopularityDto[];
  professionalOccupation: ProfessionalOccupationDto[];
  dailyAppointments: DailyAppointmentDto[];
}
