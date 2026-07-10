import { ArrowUpDown } from 'lucide-react';
import { Input, Select, type SelectOption } from '../ui';
import { CollapsibleSection, FieldRow, type TabContentProps } from './shared';
import { useQueryMetaKeys } from '../../hooks/useQueries';

const ORDERBY_BY_TYPE: Record<'posts' | 'terms' | 'users', SelectOption[]> = {
  posts: [
    { value: 'date', label: 'Date' },
    { value: 'modified', label: 'Last Modified' },
    { value: 'title', label: 'Title' },
    { value: 'name', label: 'Slug' },
    { value: 'menu_order', label: 'Menu Order' },
    { value: 'ID', label: 'ID' },
    { value: 'rand', label: 'Random' },
    { value: 'comment_count', label: 'Comment Count' },
    { value: 'meta_value', label: 'Meta Value (string)' },
    { value: 'meta_value_num', label: 'Meta Value (numeric)' },
    { value: 'post__in', label: 'Match include order' },
    { value: 'none', label: 'No ordering' },
  ],
  terms: [
    { value: 'name', label: 'Name' },
    { value: 'slug', label: 'Slug' },
    { value: 'count', label: 'Post Count' },
    { value: 'term_id', label: 'Term ID' },
    { value: 'term_group', label: 'Term Group' },
    { value: 'description', label: 'Description' },
    { value: 'parent', label: 'Parent' },
    { value: 'meta_value', label: 'Meta Value (string)' },
    { value: 'meta_value_num', label: 'Meta Value (numeric)' },
    { value: 'include', label: 'Match include order' },
    { value: 'none', label: 'No ordering' },
  ],
  users: [
    { value: 'registered', label: 'Registered Date' },
    { value: 'login', label: 'Login' },
    { value: 'nicename', label: 'Nicename' },
    { value: 'email', label: 'Email' },
    { value: 'display_name', label: 'Display Name' },
    { value: 'post_count', label: 'Post Count' },
    { value: 'ID', label: 'ID' },
    { value: 'meta_value', label: 'Meta Value (string)' },
    { value: 'meta_value_num', label: 'Meta Value (numeric)' },
    { value: 'include', label: 'Match include order' },
  ],
};

const DIRECTIONS: SelectOption[] = [
  { value: 'DESC', label: 'Descending (DESC)' },
  { value: 'ASC', label: 'Ascending (ASC)' },
];

export function OrderingTab({ data, setData }: TabContentProps) {
  const { data: metaKeysPayload } = useQueryMetaKeys();
  const knownMetaKeys = metaKeysPayload?.meta_keys;
  const orderbyOptions = ORDERBY_BY_TYPE[data.query_type];
  const orderby = data.orderby ?? 'date';
  const needsMetaKey = orderby === 'meta_value' || orderby === 'meta_value_num';

  const metaKeyOptions: SelectOption[] = [
    { value: '', label: 'Select a meta key...' },
    ...((knownMetaKeys ?? []).map((k) => ({ value: k, label: k }))),
  ];

  return (
    <div className="rdcfe-space-y-6">
      <CollapsibleSection
        title="Ordering"
        icon={<ArrowUpDown className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={true}
      >
        <FieldRow label="Order By" hint="Which column drives the result order.">
          <Select
            options={orderbyOptions}
            value={orderby}
            onChange={(e) => setData((prev) => ({ ...prev, orderby: e.target.value }))}
          />
        </FieldRow>

        {needsMetaKey && (
          <FieldRow
            label="Meta Key for Ordering"
            hint="Required when ordering by meta_value / meta_value_num."
            required
          >
            <Select
              options={metaKeyOptions}
              value={data.orderby_meta_key ?? ''}
              onChange={(e) => setData((prev) => ({ ...prev, orderby_meta_key: e.target.value }))}
            />
          </FieldRow>
        )}

        <FieldRow label="Direction" hint="ASC = oldest/lowest first, DESC = newest/highest first.">
          <Select
            options={DIRECTIONS}
            value={(data.order ?? 'DESC').toUpperCase()}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                order: e.target.value as 'ASC' | 'DESC',
              }))
            }
          />
        </FieldRow>

        {orderby === 'rand' && (
          <FieldRow label="Note" hint="Random ordering bypasses object cache; use sparingly on busy sites.">
            <Input value="orderby=rand" disabled />
          </FieldRow>
        )}
      </CollapsibleSection>
    </div>
  );
}
