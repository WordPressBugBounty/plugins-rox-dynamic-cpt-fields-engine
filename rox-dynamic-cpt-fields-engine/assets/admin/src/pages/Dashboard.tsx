import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileType, 
  Tags, 
  Layers,
  FileText, 
  Plus,
  ArrowRight,
  Sparkles,
  Loader2,
  TrendingUp,
  Rocket,
  Zap,
  BookOpen,
  ExternalLink,
  Lock,
  Bot,
  Network,
  Search,
  Settings,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { usePostTypes } from '../hooks/usePostTypes';
import { useTaxonomies } from '../hooks/useTaxonomies';
import { useMetaboxes } from '../hooks/useMetaboxes';
import { useOptionsPages } from '../hooks/useOptionsPages';
import { useProContext } from '../contexts/ProContext';
import { UpgradeModal } from '../components/ui/upgrade-modal';
import type { FeatureCategory } from '../lib/pro-features';

interface StatCardProps {
  title: string;
  count: number;
  href: string;
  icon: typeof FileType;
  gradient: string;
  iconBg: string;
  isLoading?: boolean;
}

function StatCard({ title, count, href, icon: Icon, gradient, iconBg, isLoading }: StatCardProps) {
  return (
    <Link 
      to={href}
      className="rdcfe-stat-card rdcfe-group"
    >
      <div className="rdcfe-flex rdcfe-items-start rdcfe-justify-between">
        <div className={cn('rdcfe-stat-card-icon', iconBg)}>
          <Icon className={cn('rdcfe-h-6 rdcfe-w-6', gradient)} />
        </div>
        <ArrowRight className="rdcfe-h-5 rdcfe-w-5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-opacity-0 group-hover:rdcfe-opacity-100 rdcfe-transition-all rdcfe-transform group-hover:rdcfe-translate-x-1" />
      </div>
      {isLoading ? (
        <Loader2 className="rdcfe-h-7 rdcfe-w-7 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-4 rdcfe-mb-2" />
      ) : (
        <div className="rdcfe-stat-card-value rdcfe-mt-4">{count}</div>
      )}
      <div className="rdcfe-stat-card-label">{title}</div>
      <div className="rdcfe-stat-card-trend positive rdcfe-mt-3">
        <TrendingUp className="rdcfe-w-3.5 rdcfe-h-3.5" />
        <span>Active</span>
      </div>
    </Link>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: typeof FileType;
  iconBg: string;
  iconColor: string;
  isPro?: boolean;
  proFeatureKey?: string;
  onProClick?: (feature: string, category: FeatureCategory) => void;
}

function QuickAction({ title, description, href, icon: Icon, iconBg, iconColor, isPro, proFeatureKey, onProClick }: QuickActionProps) {
  const { isPro: hasProLicense } = useProContext();
  const showLockedVariant = isPro && !hasProLicense;

  if (showLockedVariant) {
    return (
      <button
        type="button"
        onClick={() => onProClick?.(proFeatureKey || title, 'module')}
        className="rdcfe-quick-action rdcfe-group rdcfe-text-left rdcfe-cursor-pointer hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)] rdcfe-transition-all"
      >
        <div className={cn('rdcfe-quick-action-icon rdcfe-bg-[hsl(var(--rdcfe-muted))]')}>
          <Icon className="rdcfe-h-5 rdcfe-w-5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
        </div>
        <div className="rdcfe-flex-1">
          <div className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] group-hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-colors">
            {title}
          </div>
          <div className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">{description}</div>
        </div>
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
          <span className="rdcfe-pro-badge">Pro</span>
          <Lock className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] group-hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors" />
        </div>
      </button>
    );
  }

  return (
    <Link to={href} className="rdcfe-quick-action rdcfe-group">
      <div className={cn('rdcfe-quick-action-icon', iconBg)}>
        <Icon className={cn('rdcfe-h-5 rdcfe-w-5', iconColor)} />
      </div>
      <div className="rdcfe-flex-1">
        <div className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] group-hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors">
          {title}
        </div>
        <div className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">{description}</div>
      </div>
      <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-flex rdcfe-items-center rdcfe-justify-center group-hover:rdcfe-bg-[hsl(var(--rdcfe-primary))] rdcfe-transition-all">
        <Plus className="rdcfe-h-5 rdcfe-w-5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] group-hover:rdcfe-text-white rdcfe-transition-colors" />
      </div>
    </Link>
  );
}

export function Dashboard() {
  const { data: postTypes, isLoading: loadingPostTypes } = usePostTypes();
  const { data: taxonomies, isLoading: loadingTaxonomies } = useTaxonomies();
  const { data: metaboxes, isLoading: loadingMetaboxes } = useMetaboxes();
  const { data: optionsPages, isLoading: loadingOptionsPages } = useOptionsPages();
  const { upgradeUrl, isPro } = useProContext();

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const [upgradeCategory, setUpgradeCategory] = useState<FeatureCategory>('module');

  const handleProClick = (feature: string, category: FeatureCategory) => {
    setUpgradeFeature(feature);
    setUpgradeCategory(category);
    setUpgradeModalOpen(true);
  };

  const postTypeCount = postTypes?.length || 0;
  const taxonomyCount = taxonomies?.length || 0;
  const metaboxCount = metaboxes?.length || 0;
  const optionsPageCount = optionsPages?.length || 0;

  return (
    <div className="rdcfe-animate-fade-in">
      {/* Stats Grid */}
      <div className="rdcfe-stats-grid rdcfe-mb-8">
        <StatCard
          title="Post Types"
          count={postTypeCount}
          href="/post-types"
          icon={FileType}
          gradient="rdcfe-text-[hsl(var(--rdcfe-primary))]"
          iconBg="rdcfe-bg-[hsl(var(--rdcfe-accent))]"
          isLoading={loadingPostTypes}
        />
        <StatCard
          title="Taxonomies"
          count={taxonomyCount}
          href="/taxonomies"
          icon={Tags}
          gradient="rdcfe-text-[hsl(142_71%_45%)]"
          iconBg="rdcfe-bg-[hsl(142_71%_95%)]"
          isLoading={loadingTaxonomies}
        />
        <StatCard
          title="Metaboxes"
          count={metaboxCount}
          href="/metaboxes"
          icon={Layers}
          gradient="rdcfe-text-[hsl(262_83%_58%)]"
          iconBg="rdcfe-bg-[hsl(262_83%_96%)]"
          isLoading={loadingMetaboxes}
        />
        <StatCard
          title="Options Pages"
          count={optionsPageCount}
          href="/options-pages"
          icon={FileText}
          gradient="rdcfe-text-[hsl(38_92%_50%)]"
          iconBg="rdcfe-bg-[hsl(38_92%_96%)]"
          isLoading={loadingOptionsPages}
        />
      </div>

      {/* Two Column Layout */}
      <div className="rdcfe-grid rdcfe-gap-6 lg:rdcfe-grid-cols-3 rdcfe-mb-8">
        {/* Quick Actions - 2 columns */}
        <div className="lg:rdcfe-col-span-2">
          <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mb-5">
            <h2 className="rdcfe-text-[17px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
              Quick Actions
            </h2>
            <Link 
              to="/post-types"
              className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-underline rdcfe-flex rdcfe-items-center rdcfe-gap-1"
            >
              View all
              <ArrowRight className="rdcfe-w-3.5 rdcfe-h-3.5" />
            </Link>
          </div>
          <div className="rdcfe-grid rdcfe-gap-4">
            <QuickAction
              title="Create Post Type"
              description="Define custom content structures for your site"
              href="/post-types/new"
              icon={FileType}
              iconBg="rdcfe-bg-[hsl(var(--rdcfe-accent))]"
              iconColor="rdcfe-text-[hsl(var(--rdcfe-primary))]"
            />
            <QuickAction
              title="Create Taxonomy"
              description="Add categories or tags to organize content"
              href="/taxonomies/new"
              icon={Tags}
              iconBg="rdcfe-bg-[hsl(142_71%_95%)]"
              iconColor="rdcfe-text-[hsl(142_71%_45%)]"
            />
            <QuickAction
              title="Create Metabox"
              description="Add custom meta fields to your content"
              href="/metaboxes/new"
              icon={Layers}
              iconBg="rdcfe-bg-[hsl(262_83%_96%)]"
              iconColor="rdcfe-text-[hsl(262_83%_58%)]"
            />
            <QuickAction
              title="Create Options Page"
              description="Build custom settings pages for your site"
              href="/options-pages/new"
              icon={Settings}
              iconBg="rdcfe-bg-[hsl(38_92%_96%)]"
              iconColor="rdcfe-text-[hsl(38_92%_50%)]"
            />
          </div>
        </div>

        {/* Getting Started Card - 1 column */}
        <div className="rdcfe-card">
          <div className="rdcfe-p-5 rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))]">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-mb-1">
              <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-bg-gradient-to-br rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-flex rdcfe-items-center rdcfe-justify-center">
                <Rocket className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-white" />
              </div>
              <h3 className="rdcfe-text-[15px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                Getting Started
              </h3>
            </div>
          </div>
          <div className="rdcfe-p-5">
            <ul className="rdcfe-space-y-3.5">
              <li>
                <Link to="/post-types/new" className="rdcfe-flex rdcfe-items-start rdcfe-gap-3 rdcfe-group rdcfe-rounded-lg rdcfe-p-1.5 rdcfe--m-1.5 hover:rdcfe-bg-[hsl(var(--rdcfe-accent)/0.5)] rdcfe-transition-colors">
                  <div className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                    <span className="rdcfe-text-[12px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-primary))]">1</span>
                  </div>
                  <div>
                    <div className="rdcfe-text-[14px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] group-hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors">Create a Post Type</div>
                    <div className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Define your custom content structure</div>
                  </div>
                </Link>
              </li>
              <li>
                <Link to="/taxonomies/new" className="rdcfe-flex rdcfe-items-start rdcfe-gap-3 rdcfe-group rdcfe-rounded-lg rdcfe-p-1.5 rdcfe--m-1.5 hover:rdcfe-bg-[hsl(142_71%_97%)] rdcfe-transition-colors">
                  <div className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded-full rdcfe-bg-[hsl(142_71%_95%)] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                    <span className="rdcfe-text-[12px] rdcfe-font-bold rdcfe-text-[hsl(142_71%_45%)]">2</span>
                  </div>
                  <div>
                    <div className="rdcfe-text-[14px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] group-hover:rdcfe-text-[hsl(142_71%_40%)] rdcfe-transition-colors">Add Taxonomies</div>
                    <div className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Organize content with categories & tags</div>
                  </div>
                </Link>
              </li>
              <li>
                <Link to="/metaboxes/new" className="rdcfe-flex rdcfe-items-start rdcfe-gap-3 rdcfe-group rdcfe-rounded-lg rdcfe-p-1.5 rdcfe--m-1.5 hover:rdcfe-bg-[hsl(262_83%_97%)] rdcfe-transition-colors">
                  <div className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded-full rdcfe-bg-[hsl(262_83%_96%)] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                    <span className="rdcfe-text-[12px] rdcfe-font-bold rdcfe-text-[hsl(262_83%_58%)]">3</span>
                  </div>
                  <div>
                    <div className="rdcfe-text-[14px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] group-hover:rdcfe-text-[hsl(262_83%_50%)] rdcfe-transition-colors">Create Metaboxes</div>
                    <div className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Add custom fields to your content</div>
                  </div>
                </Link>
              </li>
              <li>
                <Link to="/options-pages/new" className="rdcfe-flex rdcfe-items-start rdcfe-gap-3 rdcfe-group rdcfe-rounded-lg rdcfe-p-1.5 rdcfe--m-1.5 hover:rdcfe-bg-[hsl(38_92%_97%)] rdcfe-transition-colors">
                  <div className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded-full rdcfe-bg-[hsl(38_92%_96%)] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                    <span className="rdcfe-text-[12px] rdcfe-font-bold rdcfe-text-[hsl(38_92%_50%)]">4</span>
                  </div>
                  <div>
                    <div className="rdcfe-text-[14px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] group-hover:rdcfe-text-[hsl(38_92%_45%)] rdcfe-transition-colors">Options Page</div>
                    <div className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Build custom settings pages</div>
                  </div>
                </Link>
              </li>
              <li>
                <Link to="/settings" className="rdcfe-flex rdcfe-items-start rdcfe-gap-3 rdcfe-group rdcfe-rounded-lg rdcfe-p-1.5 rdcfe--m-1.5 hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-transition-colors">
                  <div className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                    <span className="rdcfe-text-[12px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">5</span>
                  </div>
                  <div>
                    <div className="rdcfe-text-[14px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] group-hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors">Configure Settings</div>
                    <div className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Customize plugin behavior</div>
                  </div>
                </Link>
              </li>
            </ul>
            <div className="rdcfe-mt-4 rdcfe-pt-4 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
              <a 
                href="https://developer.wordpress.org/plugins/"
                target="_blank"
                rel="noopener noreferrer"
                className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-underline"
              >
                <BookOpen className="rdcfe-w-4 rdcfe-h-4" />
                View Documentation
                <ExternalLink className="rdcfe-w-3 rdcfe-h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Pro Features Preview & Upgrade Banner — only shown to Free users */}
      {!isPro && (
        <>
          <div className="rdcfe-mb-8">
            <h2 className="rdcfe-text-[17px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-5">
              Pro Features
            </h2>
            <div className="rdcfe-grid rdcfe-gap-4 md:rdcfe-grid-cols-2 lg:rdcfe-grid-cols-4">
              <QuickAction
                title="Listings"
                description="Display dynamic content grids"
                href="/listings"
                icon={Layers}
                iconBg="rdcfe-bg-[hsl(var(--rdcfe-muted))]"
                iconColor="rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]"
                isPro={true}
                proFeatureKey="listings"
                onProClick={handleProClick}
              />
              <QuickAction
                title="Query Builder"
                description="Build custom WordPress queries"
                href="/queries"
                icon={Search}
                iconBg="rdcfe-bg-[hsl(var(--rdcfe-muted))]"
                iconColor="rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]"
                isPro={true}
                proFeatureKey="query_builder"
                onProClick={handleProClick}
              />
              <QuickAction
                title="Relations"
                description="Link content together"
                href="/relations"
                icon={Network}
                iconBg="rdcfe-bg-[hsl(var(--rdcfe-muted))]"
                iconColor="rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]"
                isPro={true}
                proFeatureKey="relations"
                onProClick={handleProClick}
              />
              <QuickAction
                title="AI Assistant"
                description="Generate content with AI"
                href="/ai-assistant"
                icon={Bot}
                iconBg="rdcfe-bg-[hsl(var(--rdcfe-muted))]"
                iconColor="rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]"
                isPro={true}
                proFeatureKey="ai_assistant"
                onProClick={handleProClick}
              />
            </div>
          </div>

          {/* Pro Upgrade Banner */}
          <div className="rdcfe-card rdcfe-overflow-hidden">
            <div className="rdcfe-flex rdcfe-flex-col md:rdcfe-flex-row rdcfe-items-center rdcfe-gap-6 rdcfe-p-6">
              <div className="rdcfe-w-14 rdcfe-h-14 rdcfe-rounded-2xl rdcfe-bg-gradient-to-br rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0">
                <Zap className="rdcfe-w-7 rdcfe-h-7 rdcfe-text-white" />
              </div>
              <div className="rdcfe-flex-1 rdcfe-text-center md:rdcfe-text-left">
                <h4 className="rdcfe-text-[16px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1">
                  Unlock Pro Features
                </h4>
                <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  Get access to Listings, Query Builder, Relations, AI Assistant, Advanced Field Types, and priority support.
                </p>
              </div>
              <a
                href={upgradeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rdcfe-btn rdcfe-btn-primary rdcfe-whitespace-nowrap"
              >
                <Sparkles className="rdcfe-w-4 rdcfe-h-4" />
                Upgrade to Pro
              </a>
            </div>
          </div>
        </>
      )}

      {/* Pro Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature={upgradeFeature}
        featureCategory={upgradeCategory}
      />
    </div>
  );
}
