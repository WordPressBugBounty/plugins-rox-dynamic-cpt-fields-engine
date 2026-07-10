import type { ListingConfig } from '../services/api';

/**
 * Single source of truth for "where does this listing open when edited?"
 * Used by the list table, duplicate flow, and create modal navigation.
 */
export function getListingEditPath(listing: Pick<ListingConfig, 'id' | 'data'>): string {
  const type = listing.data?.listing_type ?? 'template';

  if (type === 'grid') {
    return `/listings/grid/${listing.id}`;
  }

  if (type === 'single_page' || type === 'archive_page') {
    return `/listings/page/${listing.id}`;
  }

  return `/listings/template/${listing.id}`;
}
