
export interface User {
  id: string;
  name: string;
}

export interface Trip {
  id: string;
  name: string;
  participants: string[];
  memberAvatars?: { [name: string]: string }; // Maps participant name to avatar ID
  createdAt: number;
}

export type PaymentMethod = 'Cash' | 'UPI';

export type SplitType = 'fair' | 'custom';

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  paidBy: string; 
  splitBetween: string[];
  perPersonAmount: number;
  splitType?: SplitType;
  customSplits?: { [name: string]: number }; // For custom split amounts per person
  paymentMethod: PaymentMethod;
  proofImageUrl?: string;
  createdAt: number;
}

export interface Balance {
  name: string;
  paid: number;
  owed: number;
  net: number;
}

export interface Settlement {
  id: string;
  tripId: string;
  from: string;
  to: string;
  amount: number;
  isPaid: boolean;
  paidAt?: number;
  proofImageUrl?: string; // Payment proof image
  createdAt: number;
}
