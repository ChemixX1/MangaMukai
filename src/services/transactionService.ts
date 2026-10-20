export type TransactionCategory = 'recharges' | 'purchases' | 'chapters' | 'bonuses';
export type TransactionStatus = 'completed' | 'pending' | 'cancelled' | 'refunded';

export interface AccountTransaction {
  id: string;
  category: TransactionCategory;
  title: string;
  createdAt: string;
  status: TransactionStatus;

  amount: number;
  unit: 'coins' | 'PEN' | 'USD';
  chapterId?: string;
}

export interface TransactionPage {
  items: AccountTransaction[];
  nextCursor: string | null;
}

export async function getTransactions(
  category: TransactionCategory,
  options: { cursor?: string; signal?: AbortSignal } = {},
): Promise<TransactionPage | null> {
  void category;
  options.signal?.throwIfAborted();
  return null;
}
