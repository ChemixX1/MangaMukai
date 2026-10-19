export type PlanCycle = 'yearly' | 'monthly';

export const PLANS: Record<PlanCycle, {
  id: PlanCycle;
  label: string;
  tierName: string;
  badge?: string;
  savingsNote?: string;
  monthlyPrice: string;
  price: number;
  billingNote: string;
  ctaPrice: string;
}> = {
  yearly: {
    id: 'yearly',
    label: 'Anual',
    tierName: 'Pro Anual',
    badge: 'AHORRA 20%',
    savingsNote: 'Recibe una bonificación de 500 monedas',
    monthlyPrice: '$3.99',
    price: 47.88,
    billingNote: '',
    ctaPrice: '$47.88 / año',
  },
  monthly: {
    id: 'monthly',
    label: 'Mensual',
    tierName: 'Pro Mensual',
    savingsNote: 'Facturación mes a mes',
    monthlyPrice: '$4.99',
    price: 4.99,
    billingNote: 'Facturado mensualmente',
    ctaPrice: '$4.99 / mes',
  },
};

