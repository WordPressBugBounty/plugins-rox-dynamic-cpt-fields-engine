import { MetaQueryTab } from './MetaQueryTab';
import { TaxQueryTab } from './TaxQueryTab';
import type { TabContentProps } from './shared';

/**
 * Single “Tax & meta” tab: both blocks stay as separate cards (CollapsibleSection)
 * so nothing is hidden behind sub-navigation.
 */
export function TaxMetaTab(props: TabContentProps) {
  return (
    <div className="rdcfe-space-y-8">
      <TaxQueryTab {...props} />
      <MetaQueryTab {...props} />
    </div>
  );
}
