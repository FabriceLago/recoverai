export type PlanId = 'STARTER' | 'PRO' | 'BUSINESS';

export interface Plan {
  id: PlanId;
  name: string;
  priceEurMonthly: number;
}

// §32
export const PLANS: Plan[] = [
  { id: 'STARTER', name: 'Starter', priceEurMonthly: 49 },
  { id: 'PRO', name: 'Pro', priceEurMonthly: 99 },
  { id: 'BUSINESS', name: 'Business', priceEurMonthly: 249 },
];
