import type { JSX } from 'react';
import { useBalance } from '@/store/walletStore';

export default function BalanceBadge(): JSX.Element {
  const balance = useBalance() ?? 0;
  return (
    <div className="rounded border border-gold bg-transparent px-3.5 py-1.5 font-mono text-gold-bright">
      💰 {balance.toLocaleString()}
    </div>
  );
}
