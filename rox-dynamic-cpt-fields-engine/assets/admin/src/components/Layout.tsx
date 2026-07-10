import { ReactNode, useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useProContext } from '../contexts/ProContext';
import {
  FileType,
  Tags,
  Layers,
  Settings,
  FileText,
  ChevronDown,
  Sparkles,
  Crown,
  Bot,
  type LucideIcon,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  pro?: boolean;
}

const mainNavItems: NavItem[] = [
  { title: 'Post Types', href: '/post-types', icon: FileType },
  { title: 'Taxonomies', href: '/taxonomies', icon: Tags },
  { title: 'Listings', href: '/listings', icon: Layers, pro: true },
  { title: 'Query Builder', href: '/queries', icon: FileText, pro: true },
  { title: 'AI Assistant', href: '/ai-assistant', icon: Bot, pro: true },

];

const moreNavItems: NavItem[] = [
  { title: 'Relations', href: '/relations', icon: Tags, pro: true },
  { title: 'Metabox', href: '/metaboxes', icon: Layers },
  { title: 'Options Pages', href: '/options-pages', icon: FileText },
  { title: 'Settings', href: '/settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { upgradeUrl, isPro } = useProContext();

  const isMoreActive = moreNavItems.some(
    (item) =>
      location.pathname === item.href ||
      (item.href !== '/' && location.pathname.startsWith(item.href))
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for hash changes from WordPress submenu clicks
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#/')) {
        const path = hash.slice(1);
        if (path !== location.pathname) {
          navigate(path);
        }
      }
    };

    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [navigate, location.pathname]);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname === href || location.pathname.startsWith(href);
  };

  return (
    <div className="rdcfe-min-h-full rdcfe-bg-[hsl(var(--rdcfe-background))]">
      {/* Top Navigation */}
      <header className="rdcfe-bg-white rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-sticky rdcfe-top-[32px] rdcfe-z-40 rdcfe-shadow-sm">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-h-16 rdcfe-px-6 rdcfe-pl-8 rdcfe-max-w-[1600px] rdcfe-mx-auto">
          {/* Logo - Clickable to Dashboard */}
          <NavLink 
            to="/"
            className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-pr-8 rdcfe-border-r rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-mr-8 hover:rdcfe-opacity-80 rdcfe-transition-opacity"
          >
            <div className="rdcfe-flex rdcfe-h-10 rdcfe-w-10 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-xl rdcfe-bg-gradient-to-br rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-shadow-lg rdcfe-shadow-[#7367f0]/30">
              <Sparkles className="rdcfe-h-5 rdcfe-w-5 rdcfe-text-white" />
            </div>
            <div className="rdcfe-flex rdcfe-flex-col">
              <span className="rdcfe-text-[16px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-leading-tight rdcfe-tracking-tight">
                Dynamic CPT
              </span>
              <span className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-tight rdcfe-font-medium">
                Fields Engine
              </span>
            </div>
          </NavLink>

          {/* Navigation */}
          <nav className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-h-full rdcfe-pl-2">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  'rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-h-10 rdcfe-px-4 rdcfe-text-[14px] rdcfe-font-medium rdcfe-rounded-lg rdcfe-transition-all rdcfe-duration-200',
                  isActive(item.href)
                    ? 'rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-text-[hsl(var(--rdcfe-primary))]'
                    : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                )}
              >
                <item.icon className="rdcfe-h-4 rdcfe-w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}

            {/* More Dropdown */}
            <div className="rdcfe-relative" ref={dropdownRef}>
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={cn(
                  'rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-h-10 rdcfe-px-4 rdcfe-text-[14px] rdcfe-font-medium rdcfe-rounded-lg rdcfe-transition-all rdcfe-duration-200',
                  isMoreActive || moreOpen
                    ? 'rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-text-[hsl(var(--rdcfe-primary))]'
                    : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                )}
              >
                <span>More</span>
                <ChevronDown className={cn(
                  'rdcfe-h-4 rdcfe-w-4 rdcfe-transition-transform rdcfe-duration-200',
                  moreOpen && 'rdcfe-rotate-180'
                )} />
              </button>

              {moreOpen && (
                <div className="rdcfe-absolute rdcfe-top-full rdcfe-left-0 rdcfe-mt-2 rdcfe-w-56 rdcfe-bg-white rdcfe-rounded-xl rdcfe-shadow-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-py-2 rdcfe-z-50 rdcfe-animate-fade-in">
                  {moreNavItems.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-px-4 rdcfe-py-3 rdcfe-text-[14px] rdcfe-transition-all',
                        isActive(item.href)
                          ? 'rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-medium'
                          : 'rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))]'
                      )}
                    >
                      <item.icon className="rdcfe-h-4 rdcfe-w-4" />
                      <span className="rdcfe-flex-1">{item.title}</span>
                      {item.pro && !isPro && (
                        <span className="rdcfe-pro-badge">Pro</span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right Side */}
          <div className="rdcfe-ml-auto rdcfe-flex rdcfe-items-center rdcfe-gap-3">
            {/* Upgrade Link — hidden for Pro users */}
            {!isPro && (
              <a
                href={upgradeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-4 rdcfe-py-2 rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-border rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-rounded-lg hover:rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)] rdcfe-transition-all"
                style={{ fontWeight: 700 }}
              >
                <Crown className="rdcfe-w-4 rdcfe-h-4" />
                Upgrade to Pro
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="rdcfe-main-content">
        {children}
      </main>
    </div>
  );
}

declare global {
  interface Window {
    rdcfeSettings?: {
      restUrl: string;
      nonce: string;
      ajaxUrl?: string;
      restNonceUrl?: string;
      version: string;
      debugMode: boolean;
      isPro?: boolean;
      proFeatures?: {
        field_types: string[];
        modules: string[];
        settings: string[];
        location_rules: string[];
      };
      upgradeUrl?: string;
      adminMenus?: Array<{ value: string; label: string }>;
      /**
       * Roster of user roles localised by AdminAssets — surfaced to the
       * Query Builder Source tab so the "Roles" multi-select can offer
       * the actual roles the site has registered (including custom
       * roles added by membership plugins) instead of a hard-coded
       * WP-core fallback list.
       */
      userRoles?: Array<{ value: string; label: string }>;
      /** Whether Elementor plugin is active — set by AdminAssets. */
      elementorActive?: boolean;
      /** All registered public post types — for the Create Template modal. */
      registeredPostTypes?: Array<{ value: string; label: string }>;
      /** WordPress admin URL — for constructing editor links. */
      adminUrl?: string;
    };
  }
}
