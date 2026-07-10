import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { ProBadge } from './pro-badge';
import { Check, Zap, ExternalLink } from 'lucide-react';

interface UpgradeModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Feature that triggered the modal */
  feature?: string;
  /** Feature category for contextual benefits */
  featureCategory?: 'field_type' | 'module' | 'setting' | 'location_rule' | 'general';
}

const proFeatures = [
  '14+ Advanced Field Types',
  'Query Builder & Saved Queries',
  'Listings & Dynamic Output',
  'Relations & Connections',
  'Import Diff + Rollback',
  'AI Assistant',
];

const featureDescriptions: Record<string, string> = {
  // Field Types
  group: 'Group fields let you nest multiple fields as a single object, perfect for structured data.',
  repeater: 'Repeater fields allow unlimited rows of fields - ideal for galleries, team members, features lists.',
  wysiwyg: 'Rich text editor with full formatting options for content that needs styling.',
  gallery: 'Upload and manage multiple images with drag-drop reordering.',
  datetime: 'Date and time picker for events, schedules, and time-sensitive content.',
  time: 'Time-only picker for schedules and operating hours.',
  color: 'Color picker with transparency support for design-focused content.',
  relationship: 'Connect posts to other posts - perfect for related content, authors, and more.',
  taxonomy_picker: 'Select taxonomy terms with tree view for hierarchical data.',
  user_picker: 'Select users for author attribution, team assignments, and permissions.',
  
  // Modules
  query_builder: 'Build and save complex queries with filters, ordering, and macros.',
  listings: 'Create dynamic listing templates to display your content beautifully.',
  relations: 'Define relationships between content types for connected data.',
  visibility: 'Show or hide content based on user roles, login status, and more.',
  admin_columns: 'Customize admin list columns to see important data at a glance.',
  admin_filters: 'Filter admin lists by custom fields and taxonomies.',
  ai_assistant: 'Use AI to generate content, post types, and field configurations automatically.',
  
  // Settings
  conditional_logic: 'Show or hide fields based on other field values.',
  regex_validation: 'Advanced pattern validation for precise data control.',
  
  // Default
  default: 'Unlock this feature and many more with Rox Dynamic CPT Fields Engine Pro.',
};

/**
 * UpgradeModal - Shows when Free user clicks on Pro feature
 * 
 * Features:
 * - Contextual description based on clicked feature
 * - List of Pro benefits
 * - Upgrade CTA
 * - Close option
 */
export function UpgradeModal({
  open,
  onOpenChange,
  feature,
  featureCategory = 'general',
}: UpgradeModalProps) {
  const featureKey = feature?.toLowerCase().replace(/\s+/g, '_') || 'default';
  const description = featureDescriptions[featureKey] || featureDescriptions.default;

  const getTitle = () => {
    if (!feature) return 'Upgrade to Pro';
    
    switch (featureCategory) {
      case 'field_type':
        return `${feature} is a Pro Field`;
      case 'module':
        return `${feature} is a Pro Module`;
      case 'setting':
        return `${feature} is a Pro Feature`;
      case 'location_rule':
        return `${feature} is a Pro Location Rule`;
      default:
        return `${feature} requires Pro`;
    }
  };

  // Get upgrade URL from global settings or use default
  const upgradeUrl = (window as any).rdcfeSettings?.upgradeUrl || 
    'https://wpmet.com/plugin/dynamic-engine/';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:rdcfe-max-w-[480px]">
        <DialogHeader className="rdcfe-text-center sm:rdcfe-text-left">
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-2">
            <div className="rdcfe-flex rdcfe-h-10 rdcfe-w-10 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-full rdcfe-bg-gradient-to-br rdcfe-from-amber-400 rdcfe-to-orange-500">
              <Zap className="rdcfe-h-5 rdcfe-w-5 rdcfe-text-white" />
            </div>
            <div>
              <DialogTitle className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                {getTitle()}
                <ProBadge size="sm" />
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="rdcfe-text-left">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="rdcfe-py-4">
          <p className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-3">
            Unlock with Pro:
          </p>
          <ul className="rdcfe-space-y-2">
            {proFeatures.map((feature) => (
              <li key={feature} className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                <div className="rdcfe-flex rdcfe-h-5 rdcfe-w-5 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-full rdcfe-bg-green-100">
                  <Check className="rdcfe-h-3 rdcfe-w-3 rdcfe-text-green-600" />
                </div>
                <span className="rdcfe-text-sm rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="rdcfe-flex-col sm:rdcfe-flex-row rdcfe-gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rdcfe-w-full sm:rdcfe-w-auto"
          >
            Maybe Later
          </Button>
          <Button
            asChild
            className="rdcfe-w-full sm:rdcfe-w-auto rdcfe-bg-gradient-to-r rdcfe-from-amber-500 rdcfe-to-orange-500 hover:rdcfe-from-amber-600 hover:rdcfe-to-orange-600 rdcfe-text-white hover:rdcfe-text-white"
          >
            <a href={upgradeUrl} target="_blank" rel="noopener noreferrer">
              Upgrade to Pro
              <ExternalLink className="rdcfe-ml-2 rdcfe-h-4 rdcfe-w-4" />
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradeModal;

