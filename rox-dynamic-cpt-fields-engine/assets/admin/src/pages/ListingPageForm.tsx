/**
 * Routes single_page / archive_page listings to the correct editor:
 * - RDCFE Builder → full canvas (`ListingTemplateForm`)
 * - Gutenberg / Elementor → metadata settings (`ListingPageSettingsForm`)
 */

import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useListing } from '../hooks/useListings';
import { ListingTemplateForm } from './ListingTemplateForm';
import { ListingPageSettingsForm } from './ListingPageSettingsForm';

export function ListingPageForm() {
  const { id } = useParams();
  const listingId = id ? Number.parseInt(id, 10) : null;

  const { data: existing, isLoading } = useListing(listingId);

  if (!listingId) {
    return <ListingTemplateForm />;
  }

  if (isLoading) {
    return (
      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-py-20">
        <Loader2 className="rdcfe-h-8 rdcfe-w-8 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-primary))]" />
      </div>
    );
  }

  const editor = existing?.form?.data?.editor ?? 'rdcfe';
  if (editor !== 'rdcfe') {
    return <ListingPageSettingsForm />;
  }

  return <ListingTemplateForm />;
}
