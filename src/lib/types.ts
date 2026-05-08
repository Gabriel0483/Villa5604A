export type TenantStatus = 'Active' | 'Former' | 'Prospective';

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  roomSizeSqFt: number;
  monthlyRent: number;
  leaseStart: string;
  status: TenantStatus;
}

export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';

export interface RentPayment {
  id: string;
  tenantId: string;
  amount: number;
  date: string;
  status: PaymentStatus;
}

export type UtilityType = 'Wifi' | 'Water' | 'Electricity';

export interface Bill {
  id: string;
  type: UtilityType;
  totalAmount: number;
  date: string;
}

export type RepairStatus = 'Reported' | 'In Progress' | 'Completed';
export type RepairPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface RepairRequest {
  id: string;
  tenantId: string;
  description: string;
  priority: RepairPriority;
  status: RepairStatus;
  dateSubmitted: string;
}
