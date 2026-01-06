import { Expense, Settlement } from '../types';

export interface TransactionSuggestion {
  from: string;
  to: string;
  amount: number;
}

// Builds outstanding payer -> receiver suggestions based on expenses, minus any tracked settlements
export const buildOutstandingTransactions = (
  expenses: Expense[],
  settlements: Settlement[]
): TransactionSuggestion[] => {
  const outstanding = new Map<string, number>();

  // Add what each participant owes directly to the payer of each expense
  expenses.forEach(exp => {
    const payer = exp.paidBy;
    const getShare = (name: string): number => {
      if (exp.splitType === 'custom' && exp.customSplits) {
        return exp.customSplits[name] ?? 0;
      }
      return exp.perPersonAmount;
    };

    exp.splitBetween.forEach(name => {
      if (name === payer) return; // no self-transfer needed
      const share = getShare(name);
      if (share > 0.009) {
        const key = `${name}__${payer}`;
        outstanding.set(key, (outstanding.get(key) || 0) + share);
      }
    });
  });

  // Subtract anything already recorded as a settlement (paid or pending)
  settlements.forEach(settlement => {
    const key = `${settlement.from}__${settlement.to}`;
    if (!outstanding.has(key)) return;
    const remaining = (outstanding.get(key) || 0) - settlement.amount;
    outstanding.set(key, remaining > 0.009 ? remaining : 0);
  });

  // Net opposite directions so A->B and B->A collapse to a single direction
  const pairTotals = new Map<string, number>();
  outstanding.forEach((amount, key) => {
    if (amount <= 0.009) return;
    const [from, to] = key.split('__');
    const lower = from < to ? from : to;
    const higher = from < to ? to : from;
    const pairKey = `${lower}__${higher}`;
    const delta = from === lower ? amount : -amount;
    pairTotals.set(pairKey, (pairTotals.get(pairKey) || 0) + delta);
  });

  const netted: TransactionSuggestion[] = [];
  pairTotals.forEach((total, key) => {
    if (Math.abs(total) <= 0.009) return;
    const [a, b] = key.split('__');
    if (total > 0) {
      netted.push({ from: a, to: b, amount: total });
    } else {
      netted.push({ from: b, to: a, amount: Math.abs(total) });
    }
  });

  return netted.sort((a, b) => b.amount - a.amount);
};
