export type TransactionCategory = 'recharges' | 'purchases' | 'chapters' | 'bonuses';
export type TransactionStatus = 'completed' | 'pending' | 'cancelled' | 'refunded';

export interface AccountTransaction {
  id: string;
  category: TransactionCategory;
  title: string;
  createdAt: string;
  status: TransactionStatus;
  /** Cantidad positiva; la categoría identifica el tipo de movimiento. */
  amount: number;
  unit: 'coins' | 'PEN' | 'USD';
  chapterId?: string;
}

export interface TransactionPage {
  items: AccountTransaction[];
  nextCursor: string | null;
}

/** null = historial aún no habilitado; items: [] = historial consultado sin movimientos.
 * Sustituir este adaptador por la API autenticada cuando exista la tabla.
 * El servidor debe obtener el usuario del token, nunca de parámetros del cliente.
 */
export async function getTransactions(
  category: TransactionCategory,
  options: { cursor?: string; signal?: AbortSignal } = {},
): Promise<TransactionPage | null> {
  void category;
  options.signal?.throwIfAborted();
  return null;
}
