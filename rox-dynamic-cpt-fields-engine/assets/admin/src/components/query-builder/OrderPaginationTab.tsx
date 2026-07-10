import { OrderingTab } from './OrderingTab';
import { PaginationTab } from './PaginationTab';
import type { TabContentProps } from './shared';

/**
 * Ordering + pagination on one tab; each remains its own collapsible card.
 */
export function OrderPaginationTab(props: TabContentProps) {
  return (
    <div className="rdcfe-space-y-8">
      <OrderingTab {...props} />
      <PaginationTab {...props} />
    </div>
  );
}
