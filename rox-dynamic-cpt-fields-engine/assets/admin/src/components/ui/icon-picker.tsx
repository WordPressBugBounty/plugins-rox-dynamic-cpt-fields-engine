import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check } from 'lucide-react';

// Common WordPress Dashicons grouped by category
const iconGroups = {
  'Admin': [
    { id: 'dashicons-admin-appearance', label: 'Appearance' },
    { id: 'dashicons-admin-collapse', label: 'Collapse' },
    { id: 'dashicons-admin-comments', label: 'Comments' },
    { id: 'dashicons-admin-customizer', label: 'Customizer' },
    { id: 'dashicons-admin-generic', label: 'Generic' },
    { id: 'dashicons-admin-home', label: 'Home' },
    { id: 'dashicons-admin-links', label: 'Links' },
    { id: 'dashicons-admin-media', label: 'Media' },
    { id: 'dashicons-admin-multisite', label: 'Multisite' },
    { id: 'dashicons-admin-network', label: 'Network' },
    { id: 'dashicons-admin-page', label: 'Page' },
    { id: 'dashicons-admin-plugins', label: 'Plugins' },
    { id: 'dashicons-admin-post', label: 'Post' },
    { id: 'dashicons-admin-settings', label: 'Settings' },
    { id: 'dashicons-admin-site', label: 'Site' },
    { id: 'dashicons-admin-site-alt', label: 'Site Alt' },
    { id: 'dashicons-admin-site-alt2', label: 'Site Alt 2' },
    { id: 'dashicons-admin-site-alt3', label: 'Site Alt 3' },
    { id: 'dashicons-admin-tools', label: 'Tools' },
    { id: 'dashicons-admin-users', label: 'Users' },
  ],
  'Post Types': [
    { id: 'dashicons-portfolio', label: 'Portfolio' },
    { id: 'dashicons-products', label: 'Products' },
    { id: 'dashicons-calendar', label: 'Calendar' },
    { id: 'dashicons-calendar-alt', label: 'Calendar Alt' },
    { id: 'dashicons-location', label: 'Location' },
    { id: 'dashicons-location-alt', label: 'Location Alt' },
    { id: 'dashicons-store', label: 'Store' },
    { id: 'dashicons-cart', label: 'Cart' },
    { id: 'dashicons-businessman', label: 'Person' },
    { id: 'dashicons-businesswoman', label: 'Person Alt' },
    { id: 'dashicons-businessperson', label: 'Business Person' },
    { id: 'dashicons-groups', label: 'Team' },
    { id: 'dashicons-building', label: 'Building' },
    { id: 'dashicons-book', label: 'Book' },
    { id: 'dashicons-book-alt', label: 'Book Alt' },
    { id: 'dashicons-welcome-learn-more', label: 'Learn' },
    { id: 'dashicons-testimonial', label: 'Testimonial' },
    { id: 'dashicons-tickets-alt', label: 'Tickets' },
    { id: 'dashicons-id', label: 'ID Card' },
    { id: 'dashicons-id-alt', label: 'ID Alt' },
    { id: 'dashicons-clipboard', label: 'Clipboard' },
    { id: 'dashicons-nametag', label: 'Name Tag' },
    { id: 'dashicons-pressthis', label: 'Press This' },
    { id: 'dashicons-hammer', label: 'Hammer' },
  ],
  'Media': [
    { id: 'dashicons-format-image', label: 'Image' },
    { id: 'dashicons-format-video', label: 'Video' },
    { id: 'dashicons-format-audio', label: 'Audio' },
    { id: 'dashicons-format-gallery', label: 'Gallery' },
    { id: 'dashicons-images-alt', label: 'Images' },
    { id: 'dashicons-images-alt2', label: 'Images 2' },
    { id: 'dashicons-camera', label: 'Camera' },
    { id: 'dashicons-camera-alt', label: 'Camera Alt' },
    { id: 'dashicons-media-archive', label: 'Archive' },
    { id: 'dashicons-media-code', label: 'Code' },
    { id: 'dashicons-media-default', label: 'Default' },
    { id: 'dashicons-media-document', label: 'Document' },
    { id: 'dashicons-media-interactive', label: 'Interactive' },
    { id: 'dashicons-media-spreadsheet', label: 'Spreadsheet' },
    { id: 'dashicons-media-text', label: 'Text' },
    { id: 'dashicons-playlist-audio', label: 'Playlist Audio' },
    { id: 'dashicons-playlist-video', label: 'Playlist Video' },
    { id: 'dashicons-controls-play', label: 'Play' },
    { id: 'dashicons-microphone', label: 'Microphone' },
    { id: 'dashicons-video-alt', label: 'Video Alt' },
    { id: 'dashicons-video-alt2', label: 'Video Alt 2' },
    { id: 'dashicons-video-alt3', label: 'Video Alt 3' },
  ],
  'Social': [
    { id: 'dashicons-share', label: 'Share' },
    { id: 'dashicons-share-alt', label: 'Share Alt' },
    { id: 'dashicons-share-alt2', label: 'Share Alt 2' },
    { id: 'dashicons-rss', label: 'RSS' },
    { id: 'dashicons-email', label: 'Email' },
    { id: 'dashicons-email-alt', label: 'Email Alt' },
    { id: 'dashicons-email-alt2', label: 'Email Alt 2' },
    { id: 'dashicons-networking', label: 'Networking' },
    { id: 'dashicons-facebook', label: 'Facebook' },
    { id: 'dashicons-facebook-alt', label: 'Facebook Alt' },
    { id: 'dashicons-twitter', label: 'Twitter' },
    { id: 'dashicons-twitter-alt', label: 'Twitter Alt' },
    { id: 'dashicons-instagram', label: 'Instagram' },
    { id: 'dashicons-linkedin', label: 'LinkedIn' },
    { id: 'dashicons-pinterest', label: 'Pinterest' },
    { id: 'dashicons-podio', label: 'Podio' },
    { id: 'dashicons-reddit', label: 'Reddit' },
    { id: 'dashicons-spotify', label: 'Spotify' },
    { id: 'dashicons-twitch', label: 'Twitch' },
    { id: 'dashicons-whatsapp', label: 'WhatsApp' },
    { id: 'dashicons-xing', label: 'Xing' },
    { id: 'dashicons-youtube', label: 'YouTube' },
    { id: 'dashicons-google', label: 'Google' },
    { id: 'dashicons-amazon', label: 'Amazon' },
  ],
  'Symbols': [
    { id: 'dashicons-star-filled', label: 'Star' },
    { id: 'dashicons-star-half', label: 'Star Half' },
    { id: 'dashicons-star-empty', label: 'Star Empty' },
    { id: 'dashicons-heart', label: 'Heart' },
    { id: 'dashicons-awards', label: 'Award' },
    { id: 'dashicons-flag', label: 'Flag' },
    { id: 'dashicons-thumbs-up', label: 'Thumbs Up' },
    { id: 'dashicons-thumbs-down', label: 'Thumbs Down' },
    { id: 'dashicons-lightbulb', label: 'Lightbulb' },
    { id: 'dashicons-info', label: 'Info' },
    { id: 'dashicons-info-outline', label: 'Info Outline' },
    { id: 'dashicons-warning', label: 'Warning' },
    { id: 'dashicons-yes', label: 'Yes' },
    { id: 'dashicons-yes-alt', label: 'Yes Alt' },
    { id: 'dashicons-no', label: 'No' },
    { id: 'dashicons-no-alt', label: 'No Alt' },
    { id: 'dashicons-plus', label: 'Plus' },
    { id: 'dashicons-plus-alt', label: 'Plus Alt' },
    { id: 'dashicons-plus-alt2', label: 'Plus Alt 2' },
    { id: 'dashicons-minus', label: 'Minus' },
    { id: 'dashicons-dismiss', label: 'Dismiss' },
    { id: 'dashicons-marker', label: 'Marker' },
    { id: 'dashicons-saved', label: 'Saved' },
    { id: 'dashicons-tag', label: 'Tag' },
    { id: 'dashicons-category', label: 'Category' },
    { id: 'dashicons-format-quote', label: 'Quote' },
    { id: 'dashicons-format-chat', label: 'Chat' },
    { id: 'dashicons-format-status', label: 'Status' },
    { id: 'dashicons-format-aside', label: 'Aside' },
    { id: 'dashicons-smiley', label: 'Smiley' },
  ],
  'Actions': [
    { id: 'dashicons-edit', label: 'Edit' },
    { id: 'dashicons-move', label: 'Move' },
    { id: 'dashicons-trash', label: 'Trash' },
    { id: 'dashicons-visibility', label: 'Visibility' },
    { id: 'dashicons-hidden', label: 'Hidden' },
    { id: 'dashicons-lock', label: 'Lock' },
    { id: 'dashicons-unlock', label: 'Unlock' },
    { id: 'dashicons-search', label: 'Search' },
    { id: 'dashicons-filter', label: 'Filter' },
    { id: 'dashicons-sort', label: 'Sort' },
    { id: 'dashicons-update', label: 'Update' },
    { id: 'dashicons-update-alt', label: 'Update Alt' },
    { id: 'dashicons-download', label: 'Download' },
    { id: 'dashicons-upload', label: 'Upload' },
    { id: 'dashicons-external', label: 'External' },
    { id: 'dashicons-backup', label: 'Backup' },
    { id: 'dashicons-cloud', label: 'Cloud' },
    { id: 'dashicons-cloud-saved', label: 'Cloud Saved' },
    { id: 'dashicons-cloud-upload', label: 'Cloud Upload' },
    { id: 'dashicons-screenoptions', label: 'Screen Options' },
    { id: 'dashicons-menu', label: 'Menu' },
    { id: 'dashicons-menu-alt', label: 'Menu Alt' },
    { id: 'dashicons-menu-alt2', label: 'Menu Alt 2' },
    { id: 'dashicons-menu-alt3', label: 'Menu Alt 3' },
    { id: 'dashicons-dashboard', label: 'Dashboard' },
  ],
  'Objects': [
    { id: 'dashicons-phone', label: 'Phone' },
    { id: 'dashicons-smartphone', label: 'Smartphone' },
    { id: 'dashicons-tablet', label: 'Tablet' },
    { id: 'dashicons-desktop', label: 'Desktop' },
    { id: 'dashicons-laptop', label: 'Laptop' },
    { id: 'dashicons-clock', label: 'Clock' },
    { id: 'dashicons-schedule', label: 'Schedule' },
    { id: 'dashicons-money', label: 'Money' },
    { id: 'dashicons-money-alt', label: 'Money Alt' },
    { id: 'dashicons-vault', label: 'Vault' },
    { id: 'dashicons-shield', label: 'Shield' },
    { id: 'dashicons-shield-alt', label: 'Shield Alt' },
    { id: 'dashicons-megaphone', label: 'Megaphone' },
    { id: 'dashicons-airplane', label: 'Airplane' },
    { id: 'dashicons-car', label: 'Car' },
    { id: 'dashicons-food', label: 'Food' },
    { id: 'dashicons-beer', label: 'Beer' },
    { id: 'dashicons-coffee', label: 'Coffee' },
    { id: 'dashicons-palmtree', label: 'Palm Tree' },
    { id: 'dashicons-pets', label: 'Pets' },
    { id: 'dashicons-universal-access', label: 'Universal Access' },
    { id: 'dashicons-universal-access-alt', label: 'Universal Access Alt' },
    { id: 'dashicons-games', label: 'Games' },
    { id: 'dashicons-hourglass', label: 'Hourglass' },
    { id: 'dashicons-database', label: 'Database' },
    { id: 'dashicons-database-add', label: 'Database Add' },
    { id: 'dashicons-database-export', label: 'Database Export' },
    { id: 'dashicons-database-import', label: 'Database Import' },
    { id: 'dashicons-database-remove', label: 'Database Remove' },
    { id: 'dashicons-database-view', label: 'Database View' },
  ],
};

// Flatten all icons for search
const allIcons = Object.values(iconGroups).flat();

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Float the panel via portal — use inside scrollable/narrow sidebars. */
  portal?: boolean;
  /** Narrower panel (320px, 4-col grid) for inspector rails. */
  compact?: boolean;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'below' | 'above';
}

export function IconPicker({
  value,
  onChange,
  label,
  portal = false,
  compact = false,
}: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('Post Types');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);

  const panelWidth = compact ? 320 : 400;
  const gridCols = compact ? 4 : 6;

  const updateDropdownPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const desiredHeight = compact ? 380 : 450;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const placement: 'below' | 'above' =
      spaceBelow >= 260 || spaceBelow >= spaceAbove ? 'below' : 'above';
    const maxHeight = Math.min(
      desiredHeight,
      placement === 'below' ? spaceBelow : spaceAbove
    );

    let left = rect.left;
    const maxLeft = window.innerWidth - panelWidth - viewportPadding;
    left = Math.max(viewportPadding, Math.min(left, maxLeft));

    const top =
      placement === 'below'
        ? rect.bottom + 8
        : Math.max(viewportPadding, rect.top - maxHeight - 8);

    setDropdownPos({
      top,
      left,
      width: panelWidth,
      maxHeight: Math.max(220, maxHeight),
      placement,
    });
  }, [compact, panelWidth]);

  // Close dropdown when clicking outside (trigger + portaled panel).
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) {
        return;
      }
      if (panelRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !portal) {
      return;
    }

    updateDropdownPosition();

    const handleReposition = () => updateDropdownPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, portal, updateDropdownPosition]);

  // Filter icons based on search
  const filteredIcons = searchQuery 
    ? allIcons.filter(icon => 
        icon.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        icon.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : iconGroups[activeGroup as keyof typeof iconGroups] || [];

  const selectedIcon = allIcons.find(icon => icon.id === value);

  const handleSelect = (iconId: string) => {
    onChange(iconId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const toggleOpen = () => {
    setIsOpen((open) => {
      const next = !open;
      if (next && portal) {
        requestAnimationFrame(() => updateDropdownPosition());
      }
      return next;
    });
  };

  const dropdownPanel = isOpen ? (
    <div
      ref={panelRef}
      className={`rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-shadow-xl ${
        portal ? 'rdcfe-fixed' : 'rdcfe-absolute rdcfe-mt-2 rdcfe-w-full'
      } ${compact ? 'rdcfe-min-w-0' : 'rdcfe-min-w-[400px]'}`}
      style={
        portal && dropdownPos
          ? {
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              maxHeight: dropdownPos.maxHeight,
              zIndex: 100000,
              border: '1px solid hsl(var(--rdcfe-border))',
            }
          : {
              border: '1px solid hsl(var(--rdcfe-border))',
              maxHeight: compact ? '380px' : '450px',
              zIndex: 9999,
            }
      }
    >
      {/* Search Header */}
      <div className={`rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))] ${compact ? 'rdcfe-p-2' : 'rdcfe-p-3'}`}>
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-3 rdcfe-py-2 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted))]">
          <Search className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search icons..."
            className="rdcfe-flex-1 rdcfe-bg-transparent rdcfe-text-[14px] rdcfe-outline-none rdcfe-placeholder-[hsl(var(--rdcfe-muted-foreground))]"
            style={{ border: 'none', boxShadow: 'none' }}
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="rdcfe-p-1 rdcfe-rounded hover:rdcfe-bg-[hsl(var(--rdcfe-border))]"
            >
              <X className="rdcfe-w-3 rdcfe-h-3 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs (only show when not searching) */}
      {!searchQuery && (
        <div className="rdcfe-flex rdcfe-gap-1 rdcfe-p-2 rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-overflow-x-auto rdcfe-scrollbar-hide">
          {Object.keys(iconGroups).map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setActiveGroup(group)}
              className={`rdcfe-px-2.5 rdcfe-py-1 rdcfe-rounded-lg rdcfe-text-[12px] rdcfe-font-medium rdcfe-whitespace-nowrap rdcfe-transition-colors ${
                activeGroup === group
                  ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))] rdcfe-text-white'
                  : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))]'
              }`}
              style={activeGroup === group ? { color: 'white' } : {}}
            >
              {group}
            </button>
          ))}
        </div>
      )}

      {/* Icon Grid */}
      <div
        className={compact ? 'rdcfe-p-2 rdcfe-overflow-y-auto' : 'rdcfe-p-3 rdcfe-overflow-y-auto'}
        style={{ maxHeight: compact ? '220px' : '280px' }}
      >
        {filteredIcons.length === 0 ? (
          <div className="rdcfe-text-center rdcfe-py-8 rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
            No icons found matching "{searchQuery}"
          </div>
        ) : (
          <div
            className={`rdcfe-grid rdcfe-gap-1.5 ${gridCols === 4 ? 'rdcfe-grid-cols-4' : 'rdcfe-grid-cols-6'}`}
          >
            {filteredIcons.map((icon) => (
              <button
                key={icon.id}
                type="button"
                onClick={() => handleSelect(icon.id)}
                className={`rdcfe-group rdcfe-relative rdcfe-flex rdcfe-flex-col rdcfe-items-center rdcfe-justify-center rdcfe-rounded-lg rdcfe-transition-all ${
                  compact ? 'rdcfe-p-2' : 'rdcfe-p-3'
                } ${
                  value === icon.id
                    ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.15)] rdcfe-ring-2 rdcfe-ring-[hsl(var(--rdcfe-primary))]'
                    : 'hover:rdcfe-bg-[hsl(var(--rdcfe-muted))]'
                }`}
                title={icon.label}
              >
                <span
                  className={`dashicons ${icon.id}`}
                  style={{
                    fontSize: compact ? '20px' : '24px',
                    width: compact ? '20px' : '24px',
                    height: compact ? '20px' : '24px',
                    color:
                      value === icon.id
                        ? 'hsl(var(--rdcfe-primary))'
                        : 'hsl(var(--rdcfe-foreground))',
                  }}
                />
                {value === icon.id && (
                  <div className="rdcfe-absolute rdcfe-top-0.5 rdcfe-right-0.5">
                    <Check className="rdcfe-w-3 rdcfe-h-3 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Selected Info */}
      <div className="rdcfe-px-3 rdcfe-py-2 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)]">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-gap-2 rdcfe-text-[12px]">
          <span className="rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-truncate">
            Selected:{' '}
            <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">
              {selectedIcon?.label || 'Post'}
            </strong>
          </span>
          <span className="rdcfe-font-mono rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-truncate rdcfe-max-w-[45%]">
            {value || 'dashicons-admin-post'}
          </span>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="rdcfe-relative">
      {label && (
        <label className="rdcfe-mb-1.5 rdcfe-block rdcfe-text-[14px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))]">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={`rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-text-left rdcfe-transition-colors hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.5)] ${
          compact ? 'rdcfe-px-3 rdcfe-py-2' : 'rdcfe-px-4 rdcfe-py-3'
        }`}
        style={{ border: '1px solid hsl(var(--rdcfe-border))' }}
      >
        {/* Selected Icon Preview */}
        <div
          className={`rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] ${
            compact ? 'rdcfe-w-8 rdcfe-h-8' : 'rdcfe-w-10 rdcfe-h-10'
          }`}
        >
          <span
            className={`dashicons ${value || 'dashicons-admin-post'}`}
            style={{
              fontSize: compact ? '18px' : '24px',
              width: compact ? '18px' : '24px',
              height: compact ? '18px' : '24px',
              color: 'hsl(var(--rdcfe-primary))',
            }}
          />
        </div>

        {/* Label */}
        <div className="rdcfe-flex-1 rdcfe-min-w-0">
          <div
            className={`rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-truncate ${
              compact ? 'rdcfe-text-[13px]' : 'rdcfe-text-[14px]'
            }`}
          >
            {selectedIcon?.label || 'Post (Default)'}
          </div>
          <div className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-truncate">
            {value || 'dashicons-admin-post'}
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`rdcfe-w-5 rdcfe-h-5 rdcfe-shrink-0 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform ${isOpen ? 'rdcfe-rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {portal ? createPortal(dropdownPanel, document.body) : dropdownPanel}
    </div>
  );
}

