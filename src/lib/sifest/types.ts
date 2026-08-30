export type RegistrationStatus = 'PENDING' | 'WAITING_PAYMENT' | 'PAID' | 'VERIFIED' | 'REJECTED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED' | 'REFUNDED';

export interface Event {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
}

export interface Participant {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  institution_name: string;
  student_id: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  amount: number;
  status: PaymentStatus;
  payment_method: string | null;
  payment_type: string | null;
  paid_at: string | null;
}

export interface Registration {
  id: string;
  registration_code: string;
  status: RegistrationStatus;
  created_at: string;
  event_id: string;
  participant_id: string;
  transaction_id: string | null;
  
  // Joined fields from Supabase
  events?: Event;
  participants?: Participant;
  transactions?: Transaction;
}
