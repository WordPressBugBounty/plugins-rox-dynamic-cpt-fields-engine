import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Settings2,
  Bot,
  Save,
  Loader2,
  RefreshCw,
  Lock,
  Wrench,
  Download,
  Upload,
  Code,
  FileJson,
  FileType,
  Tags,
  Layers,
  FileText,
  Check,
  Copy,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Key,
  Cpu,
  Eye,
  EyeOff,
  Trash2,
  History,
  KeyRound,
  ShieldCheck,
  PowerOff
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useProContext } from '../contexts/ProContext';
import { 
  toolsApi, 
  ExportData, 
  ImportResult,
  ImportDiffResponse,
  ImportResolutionPayload,
  postTypesApi, 
  taxonomiesApi, 
  metaboxesApi, 
  optionsPagesApi,
  settingsApi,
  aiApi,
  licenseApi,
  PostTypeConfig,
  TaxonomyConfig,
  MetaboxConfig,
  OptionsPageConfig,
  AISettingsPublic,
  AISettingsPatch,
  LicensePublic
} from '../services/api';
import { DiffPreview } from '../components/import-export/DiffPreview';
import { RollbackPanel } from '../components/import-export/RollbackPanel';

type SettingsSection = 'general' | 'tools' | 'ai-assistant' | 'license';
type ToolsTab = 'export' | 'import' | 'snapshots' | 'php';

interface SidebarItem {
  id: SettingsSection;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isPro?: boolean;
}

interface ConfigItem {
  id: number;
  title: string;
  slug: string;
  type: 'post_type' | 'taxonomy' | 'field_group' | 'options_page';
  status: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Basic plugin settings',
    icon: Settings2,
  },
  {
    id: 'tools',
    label: 'Tools',
    description: 'Import, Export & PHP',
    icon: Wrench,
  },
  {
    id: 'ai-assistant',
    label: 'AI Assistant',
    description: 'OpenAI integration',
    icon: Bot,
    isPro: true,
  },
];

/**
 * License tab — appended to the sidebar ONLY when Pro is active. Unlike the
 * AI Assistant tab (always shown with a Pro overlay), the License screen is
 * the activation surface for the Pro plugin itself: it has no meaning on a
 * Free install, and its `/license` REST routes only exist when Pro is
 * loaded. So we hide the entry entirely for Free sites rather than overlay
 * it.
 */
const licenseSidebarItem: SidebarItem = {
  id: 'license',
  label: 'License',
  description: 'Activation & updates',
  icon: KeyRound,
};

const typeIcons = {
  post_type: FileType,
  taxonomy: Tags,
  field_group: Layers,
  options_page: FileText,
};

const typeLabels = {
  post_type: 'Post Type',
  taxonomy: 'Taxonomy',
  field_group: 'Field Group',
  options_page: 'Options Page',
};

/** Read-only API key field after save — never show partial key fragments in the UI. */
const SAVED_API_KEY_MASK_DISPLAY = '******************************************************************';

// Toggle Switch Component
function Toggle({ 
  checked, 
  onChange, 
  disabled = false,
  variant = 'default'
}: { 
  checked: boolean; 
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}) {
  const colorClass = variant === 'danger' 
    ? 'peer-checked:rdcfe-bg-red-500 peer-focus:rdcfe-ring-red-500/20'
    : 'peer-checked:rdcfe-bg-indigo-500 peer-focus:rdcfe-ring-indigo-500/20';

  return (
    <label className={`rdcfe-relative rdcfe-inline-flex rdcfe-items-center ${disabled ? 'rdcfe-cursor-not-allowed rdcfe-opacity-50' : 'rdcfe-cursor-pointer'}`}>
      <input 
        type="checkbox" 
        className="rdcfe-peer rdcfe-sr-only" 
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <div className={`rdcfe-peer rdcfe-h-5 rdcfe-w-9 rdcfe-rounded-full rdcfe-bg-gray-200 after:rdcfe-absolute after:rdcfe-left-[2px] after:rdcfe-top-[2px] after:rdcfe-h-4 after:rdcfe-w-4 after:rdcfe-rounded-full after:rdcfe-bg-white after:rdcfe-shadow after:rdcfe-transition-all after:rdcfe-content-[''] peer-checked:after:rdcfe-translate-x-full peer-focus:rdcfe-ring-2 ${colorClass}`}></div>
    </label>
  );
}

// Setting Row Component
function SettingRow({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-py-4">
      <div>
        <h4 className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-900">{title}</h4>
        <p className="rdcfe-mt-0.5 rdcfe-text-sm rdcfe-text-gray-500">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

// Settings Card Component
function SettingsCard({ 
  icon: Icon, 
  title, 
  description, 
  children
}: { 
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white">
      <div className="rdcfe-border-b rdcfe-border-gray-200 rdcfe-px-6 rdcfe-py-4">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
          <div className="rdcfe-flex rdcfe-h-8 rdcfe-w-8 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-lg rdcfe-bg-indigo-50">
            <Icon className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-indigo-600" />
          </div>
          <div>
            <h3 className="rdcfe-text-base rdcfe-font-semibold rdcfe-text-gray-900">{title}</h3>
            <p className="rdcfe-text-sm rdcfe-text-gray-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="rdcfe-px-6">{children}</div>
    </div>
  );
}

// Pro Feature Overlay
function ProOverlay() {
  return (
    <div className="rdcfe-absolute rdcfe-inset-0 rdcfe-z-10 rdcfe-flex rdcfe-flex-col rdcfe-items-center rdcfe-justify-center rdcfe-rounded-xl rdcfe-bg-gray-900/5 rdcfe-backdrop-blur-[1px]">
      <div className="rdcfe-flex rdcfe-flex-col rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-bg-white rdcfe-px-6 rdcfe-py-4 rdcfe-shadow-lg">
        <Lock className="rdcfe-h-6 rdcfe-w-6 rdcfe-text-indigo-500" />
        <span className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-900">Pro Feature</span>
        <button className="rdcfe-mt-1 rdcfe-rounded-lg rdcfe-bg-indigo-500 rdcfe-px-4 rdcfe-py-1.5 rdcfe-text-sm rdcfe-font-medium rdcfe-text-white hover:rdcfe-bg-indigo-600 rdcfe-transition-colors">
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}

export function Settings() {
  const { toast } = useToast();
  const { isPro } = useProContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  
  // Settings state mirrors the backend `rdcfe_settings` option keys 1:1 so
  // we never have to translate between UI ↔ persisted storage.
  const [settings, setSettings] = useState({
    autoFlushRewrite: true,
    removeDataOnUninstall: false,
  });

  // Tools state
  const [toolsTab, setToolsTab] = useState<ToolsTab>('export');
  const [allItems, setAllItems] = useState<ConfigItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  
  // Export state
  const [selectedExport, setSelectedExport] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  
  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ExportData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  /** Pro — structured diff from `tools/import-diff`. */
  const [importDiff, setImportDiff] = useState<ImportDiffResponse | null>(null);
  const [importResolutions, setImportResolutions] = useState<Record<string, ImportResolutionPayload>>({});
  const [createSnapshotBeforeImport, setCreateSnapshotBeforeImport] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // PHP Generation state
  const [selectedPHP, setSelectedPHP] = useState<number | null>(null);
  const [phpCode, setPhpCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // AI Assistant state — mirrors `\RDCFE_Pro\AI\AISettings::to_public_array()`
  // so we never have to translate between UI ↔ persisted storage. The raw
  // API key is NEVER round-tripped — after save the field shows a fixed
  // mask (`SAVED_API_KEY_MASK_DISPLAY`). A new value is submitted only from
  // `aiApiKeyDraft` when the user replaces the key.
  const [aiSettings, setAiSettings] = useState<AISettingsPublic | null>(null);
  const [aiApiKeyDraft, setAiApiKeyDraft] = useState<string>('');
  const [aiKeyTouched, setAiKeyTouched] = useState<boolean>(false);
  /** When false and a key exists, the field is read-only and shows the fixed asterisk mask. */
  const [aiKeyEditing, setAiKeyEditing] = useState<boolean>(false);
  const [aiKeyVisible, setAiKeyVisible] = useState<boolean>(false);
  const [isLoadingAiSettings, setIsLoadingAiSettings] = useState<boolean>(false);
  const [isSavingAi, setIsSavingAi] = useState<boolean>(false);

  // License state — mirrors `LicenseManager::to_public_array()` (status +
  // masked key, never the raw key). The activation key the user types lives
  // only in `licenseKeyDraft`; once activated the field is cleared and the
  // saved/masked state is shown instead.
  const [licenseStatus, setLicenseStatus] = useState<LicensePublic | null>(null);
  const [licenseKeyDraft, setLicenseKeyDraft] = useState<string>('');
  const [licenseKeyVisible, setLicenseKeyVisible] = useState<boolean>(false);
  const [isLoadingLicense, setIsLoadingLicense] = useState<boolean>(false);
  const [isActivatingLicense, setIsActivatingLicense] = useState<boolean>(false);
  const [isDeactivatingLicense, setIsDeactivatingLicense] = useState<boolean>(false);

  // Hydrate the toggles from `rdcfe_settings` so the UI reflects what's
  // actually persisted (rather than the in-memory defaults). Runs once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await settingsApi.get();
        if (cancelled) return;
        const data = response.data?.data;
        if (data) {
          setSettings({
            autoFlushRewrite: Boolean(data.auto_flush_rewrite),
            removeDataOnUninstall: Boolean(data.clean_uninstall),
          });
        }
      } catch {
        if (!cancelled) {
          toast({
            title: 'Failed to load settings',
            description: 'Using defaults. Try refreshing the page.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setIsLoadingSettings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Load items when tools section is active
  useEffect(() => {
    if (activeSection === 'tools' && allItems.length === 0) {
      loadItems();
    }
  }, [activeSection]);

  // Snapshots tab is Pro-only; avoid a blank tools view if license state changes.
  useEffect(() => {
    if (!isPro && toolsTab === 'snapshots') {
      setToolsTab('import');
    }
  }, [isPro, toolsTab]);

  // License tab only exists while Pro is active. If Pro flips off (e.g. the
  // license was deactivated) while the tab is open, fall back to General so
  // the content pane doesn't render against a now-missing sidebar entry.
  useEffect(() => {
    if (!isPro && activeSection === 'license') {
      setActiveSection('general');
    }
  }, [isPro, activeSection]);

  // Hydrate the license status the first time the License tab opens. Gated
  // on `isPro` so the request only fires when the `/license` routes exist.
  useEffect(() => {
    if (activeSection !== 'license' || !isPro || licenseStatus || isLoadingLicense) {
      return;
    }
    let cancelled = false;
    setIsLoadingLicense(true);
    (async () => {
      try {
        const response = await licenseApi.get();
        if (cancelled) return;
        setLicenseStatus(response.data);
      } catch (error) {
        if (!cancelled) {
          toast({
            title: 'Failed to load license status',
            description: error instanceof Error ? error.message : 'An error occurred.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setIsLoadingLicense(false);
      }
    })();
    return () => {
      cancelled = true;
    };

  }, [activeSection, isPro]);

  // Hydrate AI settings the first time the AI Assistant tab opens. Fenced
  // on `isPro` so Free sites don't fire a 403'd request just to populate
  // disabled placeholders behind the upgrade overlay.
  useEffect(() => {
    if (activeSection !== 'ai-assistant' || !isPro || aiSettings || isLoadingAiSettings) {
      return;
    }
    let cancelled = false;
    setIsLoadingAiSettings(true);
    (async () => {
      try {
        const response = await aiApi.getSettings();
        if (cancelled) return;
        setAiSettings(response.data);
        setAiApiKeyDraft('');
        setAiKeyTouched(false);
        setAiKeyEditing(!response.data.has_api_key);
      } catch (error) {
        if (!cancelled) {
          toast({
            title: 'Failed to load AI settings',
            description: error instanceof Error ? error.message : 'An error occurred.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setIsLoadingAiSettings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
     
  }, [activeSection, isPro]);

  /**
   * Persist a partial AI-settings patch and merge the server's response
   * back into local state so the UI reflects the canonical value (mask
   * preview, allowed_models, etc.). Reused by the toggle, the model
   * dropdown, and the explicit "Save" button below the API-key input.
   */
  const persistAiSettings = async (patch: AISettingsPatch, successMessage: string) => {
    if (!isPro) return;
    setIsSavingAi(true);
    try {
      const response = await aiApi.updateSettings(patch);
      setAiSettings(response.data);
      if (Object.prototype.hasOwnProperty.call(patch, 'api_key')) {
        setAiApiKeyDraft('');
        setAiKeyTouched(false);
        setAiKeyEditing(!response.data.has_api_key);
      }
      toast({
        title: successMessage,
        description: 'Your AI Assistant settings were updated.',
      });
    } catch (error) {
      toast({
        title: 'Failed to save AI settings',
        description: error instanceof Error ? error.message : 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingAi(false);
    }
  };

  const handleAiToggleEnabled = (checked: boolean) => {
    setAiSettings((prev) => (prev ? { ...prev, enabled: checked } : prev));
    void persistAiSettings({ enabled: checked }, checked ? 'AI Assistant enabled' : 'AI Assistant disabled');
  };

  const handleAiModelChange = (model: string) => {
    setAiSettings((prev) => (prev ? { ...prev, model } : prev));
    void persistAiSettings({ model }, 'Model updated');
  };

  const handleAiApiKeySave = () => {
    void persistAiSettings({ api_key: aiApiKeyDraft.trim() }, 'API key saved');
  };

  const handleAiApiKeyBeginChange = () => {
    setAiKeyEditing(true);
    setAiApiKeyDraft('');
    setAiKeyTouched(false);
    setAiKeyVisible(false);
  };

  const handleAiApiKeyClear = () => {
    setAiApiKeyDraft('');
    void persistAiSettings({ api_key: '' }, 'API key cleared');
  };

  /** Activate the typed license key against the remote server. */
  const handleActivateLicense = async () => {
    const key = licenseKeyDraft.trim();
    if (!key) {
      toast({
        title: 'License key required',
        description: 'Paste your license key before activating.',
        variant: 'destructive',
      });
      return;
    }

    setIsActivatingLicense(true);
    try {
      await licenseApi.activate(key);
      // Re-read the canonical status so the UI shows the masked key + valid
      // state exactly as the server stored it.
      const refreshed = await licenseApi.get();
      setLicenseStatus(refreshed.data);
      setLicenseKeyDraft('');
      setLicenseKeyVisible(false);
      toast({
        title: 'License activated',
        description: 'Your license is now active. Updates are enabled.',
      });
    } catch (error) {
      toast({
        title: 'Activation failed',
        description: error instanceof Error ? error.message : 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsActivatingLicense(false);
    }
  };

  /** Deactivate the stored license on this site. */
  const handleDeactivateLicense = async () => {
    setIsDeactivatingLicense(true);
    try {
      await licenseApi.deactivate();
      const refreshed = await licenseApi.get();
      setLicenseStatus(refreshed.data);
      setLicenseKeyDraft('');
      setLicenseKeyVisible(false);
      toast({
        title: 'License deactivated',
        description: 'This site is no longer linked to your license.',
      });
    } catch (error) {
      toast({
        title: 'Deactivation failed',
        description: error instanceof Error ? error.message : 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsDeactivatingLicense(false);
    }
  };

  const loadItems = async () => {
    setIsLoadingItems(true);
    try {
      const [postTypes, taxonomies, metaboxes, optionsPages] = await Promise.all([
        postTypesApi.getAll(),
        taxonomiesApi.getAll(),
        metaboxesApi.getAll(),
        optionsPagesApi.getAll(),
      ]);

      const items: ConfigItem[] = [
        ...postTypes.data.map((pt: PostTypeConfig) => ({
          id: pt.id,
          title: pt.title,
          slug: pt.slug,
          type: 'post_type' as const,
          status: pt.status,
        })),
        ...taxonomies.data.map((tax: TaxonomyConfig) => ({
          id: tax.id,
          title: tax.title,
          slug: tax.slug,
          type: 'taxonomy' as const,
          status: tax.status,
        })),
        ...metaboxes.data.map((mb: MetaboxConfig) => ({
          id: mb.id,
          title: mb.title,
          slug: mb.slug || '',
          type: 'field_group' as const,
          status: mb.status,
        })),
        ...optionsPages.data.map((op: OptionsPageConfig) => ({
          id: op.id,
          title: op.title,
          slug: op.slug || '',
          type: 'options_page' as const,
          status: op.status,
        })),
      ];

      setAllItems(items);
    } catch {
      toast({
        title: 'Error loading data',
        description: 'Failed to load configurations.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await settingsApi.update({
        auto_flush_rewrite: settings.autoFlushRewrite,
        clean_uninstall: settings.removeDataOnUninstall,
      });

      // Re-sync from server so the UI reflects whatever the backend
      // actually persisted (sanitized booleans, etc.).
      const data = response.data?.data;
      if (data) {
        setSettings({
          autoFlushRewrite: Boolean(data.auto_flush_rewrite),
          removeDataOnUninstall: Boolean(data.clean_uninstall),
        });
      }

      toast({
        title: 'Settings saved',
        description: 'Your settings have been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFlushRewrite = async () => {
    setIsFlushing(true);
    try {
      await toolsApi.flushRewrite();
      toast({
        title: 'Success',
        description: 'Rewrite rules have been flushed.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to flush rewrite rules.',
        variant: 'destructive',
      });
    } finally {
      setIsFlushing(false);
    }
  };

  // Export handlers
  const handleSelectExport = (id: number) => {
    const newSelected = new Set(selectedExport);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedExport(newSelected);
  };

  const handleSelectAllExport = (type: string) => {
    const typeItems = allItems.filter(item => item.type === type);
    const allSelected = typeItems.every(item => selectedExport.has(item.id));
    
    const newSelected = new Set(selectedExport);
    typeItems.forEach(item => {
      if (allSelected) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
    });
    setSelectedExport(newSelected);
  };

  const handleExport = async () => {
    if (selectedExport.size === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select at least one item to export.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      const selectedItems = allItems.filter(item => selectedExport.has(item.id));
      const types = [...new Set(selectedItems.map(item => item.type))];
      const ids = [...selectedExport];
      
      const response = await toolsApi.export(types, ids);
      
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `Exported ${selectedExport.size} item(s).`,
      });
      
      setSelectedExport(new Set());
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Import handlers
  const handleFileSelect = useCallback(async (file: File) => {
    setImportFile(file);
    setImportResult(null);
    setImportDiff(null);
    setImportResolutions({});
    setCreateSnapshotBeforeImport(true);
    
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;
      
      // Must match the `plugin` key produced by the backend Exporter — see
      // `app/ImportExport/Exporter.php` and `ImportValidator::validate_structure`.
      if (!data.plugin || data.plugin !== 'rox-dynamic-cpt-fields-engine') {
        toast({
          title: 'Invalid file',
          description: 'This file was not exported from Rox Dynamic CPT Fields Engine.',
          variant: 'destructive',
        });
        setImportFile(null);
        return;
      }
      
      setImportData(data);
      
      setIsValidating(true);
      if (isPro) {
        const response = await toolsApi.importDiff(data);
        setImportDiff(response.data);
        setImportResult({
          success: response.data.success,
          dry_run: true,
          message: response.data.message,
          validation: response.data.validation,
          imported: [],
          updated: [],
          skipped: [],
          failed: [],
        });
      } else {
        const response = await toolsApi.validateImport(data);
        setImportResult(response.data);
      }
    } catch {
      toast({
        title: 'Invalid JSON',
        description: 'The file contains invalid JSON data.',
        variant: 'destructive',
      });
      setImportFile(null);
      setImportData(null);
      setImportDiff(null);
    } finally {
      setIsValidating(false);
    }
  }, [toast, isPro]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      handleFileSelect(file);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please select a JSON file.',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!importData) return;
    
    setIsImporting(true);
    try {
      const response = isPro
        ? await toolsApi.importApply({
            data: importData,
            resolutions: importResolutions,
            create_snapshot_before: createSnapshotBeforeImport,
            snapshot_source: importFile?.name,
          })
        : await toolsApi.import(importData);
      setImportResult(response.data);
      
      if (response.data.success) {
        toast({
          title: 'Import successful',
          description: response.data.message,
        });
        
        setImportFile(null);
        setImportData(null);
        setImportDiff(null);
        setImportResolutions({});
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        window.location.reload();
      } else {
        toast({
          title: 'Import failed',
          description: response.data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearImport = () => {
    setImportFile(null);
    setImportData(null);
    setImportResult(null);
    setImportDiff(null);
    setImportResolutions({});
    setCreateSnapshotBeforeImport(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // PHP Generation
  const generatePHPCode = async (item: ConfigItem) => {
    setSelectedPHP(item.id);
    setIsGenerating(true);
    setPhpCode('');
    
    try {
      let data: Record<string, unknown> | null = null;
      const associatedFieldGroups: Array<{ title: string; data: Record<string, unknown> }> = [];
      
      switch (item.type) {
        case 'post_type': {
          const response = await postTypesApi.get(item.id);
          data = response.data.data || {};
          
          // Fetch all field groups and find ones that target this post type
          const fieldGroupsResponse = await metaboxesApi.getAll();
          const postTypeSlug = String(data.slug || '');
          
          for (const fg of fieldGroupsResponse.data) {
            const fgData = fg.data || {} as Record<string, unknown>;
            const location = (fgData.location || []) as Array<Array<{ param: string; operator: string; value: string }>>;
            
            // Check if any location rule targets this post type
            const targetsPostType = Array.isArray(location) && location.some(group => 
              Array.isArray(group) && group.some(rule => 
                rule && rule.param === 'post_type' && 
                rule.operator === '==' && 
                rule.value === postTypeSlug
              )
            );
            
            if (targetsPostType) {
              associatedFieldGroups.push({ title: fg.title, data: fgData });
            }
          }
          break;
        }
        case 'taxonomy': {
          const response = await taxonomiesApi.get(item.id);
          data = response.data.data || {};
          
          // Fetch all field groups and find ones that target this taxonomy
          const taxFieldGroupsResponse = await metaboxesApi.getAll();
          const taxonomySlug = String(data.slug || '');
          
          for (const fg of taxFieldGroupsResponse.data) {
            const fgData = fg.data || {} as Record<string, unknown>;
            const location = (fgData.location || []) as Array<Array<{ param: string; operator: string; value: string }>>;
            
            // Check if any location rule targets this taxonomy
            const targetsTaxonomy = Array.isArray(location) && location.some(group => 
              Array.isArray(group) && group.some(rule => 
                rule && rule.param === 'taxonomy' && 
                rule.operator === '==' && 
                rule.value === taxonomySlug
              )
            );
            
            if (targetsTaxonomy) {
              associatedFieldGroups.push({ title: fg.title, data: fgData });
            }
          }
          break;
        }
        case 'field_group': {
          const response = await metaboxesApi.get(item.id);
          data = response.data.data || {};
          break;
        }
        case 'options_page': {
          const response = await optionsPagesApi.get(item.id);
          data = response.data.data || {};
          
          // Fetch all field groups and find ones that target this options page
          const opFieldGroupsResponse = await metaboxesApi.getAll();
          const menuSlug = String(data.menu_slug || '');
          
          for (const fg of opFieldGroupsResponse.data) {
            const fgData = fg.data || {} as Record<string, unknown>;
            const location = (fgData.location || []) as Array<Array<{ param: string; operator: string; value: string }>>;
            
            // Check if any location rule targets this options page
            const targetsOptionsPage = Array.isArray(location) && location.some(group => 
              Array.isArray(group) && group.some(rule => 
                rule && rule.param === 'options_page' && 
                rule.operator === '==' && 
                rule.value === menuSlug
              )
            );
            
            if (targetsOptionsPage) {
              associatedFieldGroups.push({ title: fg.title, data: fgData });
            }
          }
          break;
        }
      }

      if (data) {
        const code = generatePHP(item.type, data, item.title, associatedFieldGroups);
        setPhpCode(code);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to generate PHP code.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================
  // PHP GENERATION - RDCFE API FORMAT
  // Requires Rox Dynamic CPT Fields Engine plugin
  // ============================================

  const generatePHP = (type: string, data: Record<string, unknown>, title: string, fieldGroups: Array<{ title: string; data: Record<string, unknown> }> = []): string => {
    switch (type) {
      case 'post_type':
        return generatePostTypePHP(data, title, fieldGroups);
      case 'taxonomy':
        return generateTaxonomyPHP(data, title, fieldGroups);
      case 'field_group':
        return generateFieldGroupPHP(data, title);
      case 'options_page':
        return generateOptionsPagePHP(data, title, fieldGroups);
      default:
        return '// Unknown type';
    }
  };

  // Helper to convert data to PHP array string
  const toPhpArray = (obj: unknown, indent: number = 2): string => {
    const spaces = '    '.repeat(indent);
    const innerSpaces = '    '.repeat(indent + 1);
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return 'array()';
      const items = obj.map(item => `${innerSpaces}${toPhpArray(item, indent + 1)}`).join(",\n");
      return `array(\n${items},\n${spaces})`;
    }
    
    if (obj && typeof obj === 'object') {
      const entries = Object.entries(obj as Record<string, unknown>);
      if (entries.length === 0) return 'array()';
      const items = entries.map(([key, value]) => {
        const phpKey = /^\d+$/.test(key) ? key : `'${key}'`;
        return `${innerSpaces}${phpKey} => ${toPhpArray(value, indent + 1)}`;
      }).join(",\n");
      return `array(\n${items},\n${spaces})`;
    }
    
    if (typeof obj === 'boolean') return obj ? 'true' : 'false';
    if (typeof obj === 'number') return String(obj);
    if (typeof obj === 'string') return `'${obj.replace(/'/g, "\\'")}'`;
    if (obj === null || obj === undefined) return 'null';
    
    return `'${String(obj)}'`;
  };

  const generatePostTypePHP = (data: Record<string, unknown>, title: string, fieldGroups: Array<{ title: string; data: Record<string, unknown> }> = []): string => {
    const slug = String(data.slug || 'custom_post');
    const label = String(data.label || title);
    const singularLabel = String(data.singular_label || label);
    
    // Get embedded fields from the post type data (stored as meta_fields)
    // Filter to only include actual fields (object_type === 'field' or no object_type)
    const rawFields = Array.isArray(data.meta_fields) ? data.meta_fields : (Array.isArray(data.fields) ? data.fields : []);
    const embeddedFields = rawFields.filter((f: Record<string, unknown>) => 
      !f.object_type || f.object_type === 'field'
    );
    
    const config = {
      slug,
      label,
      singular_label: singularLabel,
      description: data.description || '',
      public: data.public !== false,
      publicly_queryable: data.publicly_queryable !== false,
      show_ui: true,
      show_in_menu: true,
      show_in_rest: data.show_in_rest !== false,
      has_archive: Boolean(data.has_archive),
      hierarchical: Boolean(data.hierarchical),
      menu_position: data.menu_position || 20,
      menu_icon: data.menu_icon || 'dashicons-admin-post',
      supports: Array.isArray(data.supports) ? data.supports : ['title', 'editor', 'thumbnail'],
      taxonomies: Array.isArray(data.taxonomies) ? data.taxonomies : [],
    };

    let code = `<?php
/**
 * Register Custom Post Type: ${label}
 * 
 * REQUIRES: Rox Dynamic CPT Fields Engine plugin to be active.
 * Add this code to your theme's functions.php or a custom plugin.
 */
add_action('rdcfe/include_post_types', function() {
    if (!function_exists('rdcfe_register_post_type')) {
        return;
    }

    rdcfe_register_post_type(${toPhpArray(config, 1)});
});`;

    // Check if there are any fields to add (embedded or from field groups)
    const hasEmbeddedFields = embeddedFields.length > 0;
    const hasFieldGroups = fieldGroups.length > 0;
    
    if (hasEmbeddedFields || hasFieldGroups) {
      code += `\n\n/**
 * ============================================
 * FIELD GROUPS for ${label}
 * ============================================
 */`;
    }

    // Add embedded fields as a field group
    if (hasEmbeddedFields) {
      const embeddedKey = `group_${slug}_embedded`;
      
      const embeddedConfig = {
        key: embeddedKey,
        title: `${label} Fields`,
        fields: embeddedFields.map((f: Record<string, unknown>, idx: number) => ({
          key: `field_${embeddedKey}_${String(f.name || `field_${idx}`).replace(/[^a-z0-9_]/gi, '_')}`,
          label: f.label || '',
          name: f.name || '',
          type: f.type || 'text',
          instructions: f.description || f.instructions || '',
          required: f.required || 0,
          ...(f.choices ? { choices: f.choices } : {}),
          ...(f.default_value !== undefined ? { default_value: f.default_value } : {}),
          ...(f.placeholder ? { placeholder: f.placeholder } : {}),
          ...(f.min !== undefined ? { min: f.min } : {}),
          ...(f.max !== undefined ? { max: f.max } : {}),
          ...(f.rows ? { rows: f.rows } : {}),
        })),
        location: [[
          { param: 'post_type', operator: '==', value: slug }
        ]],
        position: 'normal',
        style: 'default',
        menu_order: 0,
        active: true,
      };

      code += `

/**
 * Embedded Fields for ${label}
 */
add_action('rdcfe/include_fields', function() {
    if (!function_exists('rdcfe_add_local_field_group')) {
        return;
    }

    rdcfe_add_local_field_group(${toPhpArray(embeddedConfig, 1)});
});`;
    }

    // Add associated field groups
    if (hasFieldGroups) {
      fieldGroups.forEach((fg) => {
        const fgData = fg.data || {};
        const fields = Array.isArray(fgData.fields) ? fgData.fields : [];
        const fgKey = `group_${slug}_${String(fgData.slug || fg.title || 'fields').replace(/[^a-z0-9_]/gi, '_').toLowerCase()}`;
        
        const fgConfig = {
          key: fgKey,
          title: fg.title || `${label} Fields`,
          fields: fields.map((f: Record<string, unknown>, idx: number) => ({
            key: `field_${fgKey}_${String(f.name || `field_${idx}`).replace(/[^a-z0-9_]/gi, '_')}`,
            label: f.label || '',
            name: f.name || '',
            type: f.type || 'text',
            instructions: f.description || f.instructions || '',
            required: f.required || 0,
            ...(f.choices ? { choices: f.choices } : {}),
            ...(f.default_value !== undefined ? { default_value: f.default_value } : {}),
            ...(f.placeholder ? { placeholder: f.placeholder } : {}),
            ...(f.min !== undefined ? { min: f.min } : {}),
            ...(f.max !== undefined ? { max: f.max } : {}),
            ...(f.rows ? { rows: f.rows } : {}),
          })),
          location: [[
            { param: 'post_type', operator: '==', value: slug }
          ]],
          position: fgData.position || 'normal',
          style: fgData.style || 'default',
          menu_order: fgData.menu_order || 0,
          active: true,
        };

        code += `

/**
 * Field Group: ${fg.title}
 */
add_action('rdcfe/include_fields', function() {
    if (!function_exists('rdcfe_add_local_field_group')) {
        return;
    }

    rdcfe_add_local_field_group(${toPhpArray(fgConfig, 1)});
});`;
      });
    }

    return code;
  };

  const generateTaxonomyPHP = (data: Record<string, unknown>, title: string, fieldGroups: Array<{ title: string; data: Record<string, unknown> }> = []): string => {
    const slug = String(data.slug || 'custom_taxonomy');
    const label = String(data.label || data.plural_label || title);
    const singularLabel = String(data.singular_label || label);
    const postTypes = Array.isArray(data.post_types) ? data.post_types : ['post'];
    
    // Get embedded fields from the taxonomy data (stored as meta_fields)
    // Filter to only include actual fields (object_type === 'field' or no object_type)
    const rawFields = Array.isArray(data.meta_fields) ? data.meta_fields : (Array.isArray(data.fields) ? data.fields : []);
    const embeddedFields = rawFields.filter((f: Record<string, unknown>) => 
      !f.object_type || f.object_type === 'field'
    );
    
    const config = {
      slug,
      label,
      singular_label: singularLabel,
      description: data.description || '',
      post_types: postTypes,
      public: data.public !== false,
      publicly_queryable: data.publicly_queryable !== false,
      hierarchical: Boolean(data.hierarchical),
      show_ui: true,
      show_in_menu: true,
      show_in_rest: data.show_in_rest !== false,
      show_admin_column: Boolean(data.show_admin_column),
      show_tagcloud: Boolean(data.show_tagcloud),
    };

    let code = `<?php
/**
 * Register Custom Taxonomy: ${label}
 * 
 * REQUIRES: Rox Dynamic CPT Fields Engine plugin to be active.
 * Add this code to your theme's functions.php or a custom plugin.
 */
add_action('rdcfe/include_taxonomies', function() {
    if (!function_exists('rdcfe_register_taxonomy')) {
        return;
    }

    rdcfe_register_taxonomy(${toPhpArray(config, 1)});
});`;

    // Check if there are any fields to add (embedded or from field groups)
    const hasEmbeddedFields = embeddedFields.length > 0;
    const hasFieldGroups = fieldGroups.length > 0;
    
    if (hasEmbeddedFields || hasFieldGroups) {
      code += `\n\n/**
 * ============================================
 * FIELD GROUPS for ${label} Taxonomy
 * ============================================
 */`;
    }

    // Add embedded fields as a field group
    if (hasEmbeddedFields) {
      const embeddedKey = `group_tax_${slug}_embedded`;
      
      const embeddedConfig = {
        key: embeddedKey,
        title: `${label} Fields`,
        fields: embeddedFields.map((f: Record<string, unknown>, idx: number) => ({
          key: `field_${embeddedKey}_${String(f.name || `field_${idx}`).replace(/[^a-z0-9_]/gi, '_')}`,
          label: f.label || '',
          name: f.name || '',
          type: f.type || 'text',
          instructions: f.description || f.instructions || '',
          required: f.required || 0,
          ...(f.choices ? { choices: f.choices } : {}),
          ...(f.default_value !== undefined ? { default_value: f.default_value } : {}),
          ...(f.placeholder ? { placeholder: f.placeholder } : {}),
        })),
        location: [[
          { param: 'taxonomy', operator: '==', value: slug }
        ]],
        position: 'normal',
        style: 'default',
        active: true,
      };

      code += `

/**
 * Embedded Fields for ${label}
 */
add_action('rdcfe/include_fields', function() {
    if (!function_exists('rdcfe_add_local_field_group')) {
        return;
    }

    rdcfe_add_local_field_group(${toPhpArray(embeddedConfig, 1)});
});`;
    }

    // Add associated field groups
    if (hasFieldGroups) {
      fieldGroups.forEach((fg) => {
        const fgData = fg.data || {};
        const fields = Array.isArray(fgData.fields) ? fgData.fields : [];
        const fgKey = `group_tax_${slug}_${String(fgData.slug || fg.title || 'fields').replace(/[^a-z0-9_]/gi, '_').toLowerCase()}`;
        
        const fgConfig = {
          key: fgKey,
          title: fg.title || `${label} Fields`,
          fields: fields.map((f: Record<string, unknown>, idx: number) => ({
            key: `field_${fgKey}_${String(f.name || `field_${idx}`).replace(/[^a-z0-9_]/gi, '_')}`,
            label: f.label || '',
            name: f.name || '',
            type: f.type || 'text',
            instructions: f.description || f.instructions || '',
            required: f.required || 0,
            ...(f.choices ? { choices: f.choices } : {}),
            ...(f.default_value !== undefined ? { default_value: f.default_value } : {}),
          })),
          location: [[
            { param: 'taxonomy', operator: '==', value: slug }
          ]],
          position: fgData.position || 'normal',
          style: fgData.style || 'default',
          active: true,
        };

        code += `

/**
 * Field Group: ${fg.title}
 */
add_action('rdcfe/include_fields', function() {
    if (!function_exists('rdcfe_add_local_field_group')) {
        return;
    }

    rdcfe_add_local_field_group(${toPhpArray(fgConfig, 1)});
});`;
      });
    }

    return code;
  };

  const generateFieldGroupPHP = (data: Record<string, unknown>, title: string): string => {
    const fields = Array.isArray(data.fields) ? data.fields : [];
    const location = Array.isArray(data.location) ? data.location : [];
    const slug = String(data.slug || title).replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    const key = `group_${slug}`;
    
    const config = {
      key,
      title,
      fields: fields.map((f: Record<string, unknown>, idx: number) => ({
        key: `field_${key}_${String(f.name || `field_${idx}`).replace(/[^a-z0-9_]/gi, '_')}`,
        label: f.label || '',
        name: f.name || '',
        type: f.type || 'text',
        instructions: f.description || f.instructions || '',
        required: f.required || 0,
        conditional_logic: f.conditional_logic || 0,
        wrapper: {
          width: f.wrapper_width || '',
          class: f.wrapper_class || '',
          id: f.wrapper_id || '',
        },
        ...(f.choices ? { choices: f.choices } : {}),
        ...(f.default_value !== undefined ? { default_value: f.default_value } : {}),
        ...(f.placeholder ? { placeholder: f.placeholder } : {}),
        ...(f.min !== undefined ? { min: f.min } : {}),
        ...(f.max !== undefined ? { max: f.max } : {}),
        ...(f.rows ? { rows: f.rows } : {}),
        ...(f.return_format ? { return_format: f.return_format } : {}),
      })),
      location: location.length > 0 ? location : [[{ param: 'post_type', operator: '==', value: 'post' }]],
      menu_order: data.menu_order || 0,
      position: data.position || 'normal',
      style: data.style || 'default',
      label_placement: data.label_placement || 'top',
      instruction_placement: data.instruction_placement || 'field',
      active: true,
      show_in_rest: data.show_in_rest || 0,
    };

    return `<?php
/**
 * Register Field Group: ${title}
 * 
 * REQUIRES: Rox Dynamic CPT Fields Engine plugin to be active.
 * Add this code to your theme's functions.php or a custom plugin.
 */
add_action('rdcfe/include_fields', function() {
    if (!function_exists('rdcfe_add_local_field_group')) {
        return;
    }

    rdcfe_add_local_field_group(${toPhpArray(config, 1)});
});`;
  };

  const generateOptionsPagePHP = (data: Record<string, unknown>, title: string, fieldGroups: Array<{ title: string; data: Record<string, unknown> }> = []): string => {
    const menuSlug = String(data.menu_slug || 'custom-options');
    const pageTitle = String(data.page_title || title);
    const menuTitle = String(data.menu_title || pageTitle);
    
    // Get embedded fields from the options page data (stored as meta_fields)
    // Filter to only include actual fields (object_type === 'field' or no object_type)
    const rawFields = Array.isArray(data.meta_fields) ? data.meta_fields : (Array.isArray(data.fields) ? data.fields : []);
    const embeddedFields = rawFields.filter((f: Record<string, unknown>) => 
      !f.object_type || f.object_type === 'field'
    );
    
    const config = {
      page_title: pageTitle,
      menu_title: menuTitle,
      menu_slug: menuSlug,
      capability: data.capability || 'manage_options',
      parent_slug: data.parent_slug || '',
      icon_url: data.icon_url || 'dashicons-admin-generic',
      position: data.position || 80,
      redirect: Boolean(data.redirect),
    };

    let code = `<?php
/**
 * Register Options Page: ${pageTitle}
 * 
 * REQUIRES: Rox Dynamic CPT Fields Engine plugin to be active.
 * Add this code to your theme's functions.php or a custom plugin.
 */
add_action('rdcfe/include_options_pages', function() {
    if (!function_exists('rdcfe_add_options_page')) {
        return;
    }

    rdcfe_add_options_page(${toPhpArray(config, 1)});
});`;

    // Check if there are any fields to add (embedded or from field groups)
    const hasEmbeddedFields = embeddedFields.length > 0;
    const hasFieldGroups = fieldGroups.length > 0;
    
    if (hasEmbeddedFields || hasFieldGroups) {
      code += `\n\n/**
 * ============================================
 * FIELD GROUPS for ${pageTitle} Options Page
 * ============================================
 */`;
    }

    // Add embedded fields as a field group
    if (hasEmbeddedFields) {
      const embeddedKey = `group_options_${menuSlug.replace(/-/g, '_')}_embedded`;
      
      const embeddedConfig = {
        key: embeddedKey,
        title: `${pageTitle} Settings`,
        fields: embeddedFields.map((f: Record<string, unknown>, idx: number) => ({
          key: `field_${embeddedKey}_${String(f.name || `field_${idx}`).replace(/[^a-z0-9_]/gi, '_')}`,
          label: f.label || '',
          name: f.name || '',
          type: f.type || 'text',
          instructions: f.description || f.instructions || '',
          required: f.required || 0,
          ...(f.choices ? { choices: f.choices } : {}),
          ...(f.default_value !== undefined ? { default_value: f.default_value } : {}),
          ...(f.placeholder ? { placeholder: f.placeholder } : {}),
        })),
        location: [[
          { param: 'options_page', operator: '==', value: menuSlug }
        ]],
        position: 'normal',
        style: 'default',
        active: true,
      };

      code += `

/**
 * Embedded Fields for ${pageTitle}
 */
add_action('rdcfe/include_fields', function() {
    if (!function_exists('rdcfe_add_local_field_group')) {
        return;
    }

    rdcfe_add_local_field_group(${toPhpArray(embeddedConfig, 1)});
});`;
    }

    // Add associated field groups
    if (hasFieldGroups) {
      fieldGroups.forEach((fg) => {
        const fgData = fg.data || {};
        const fields = Array.isArray(fgData.fields) ? fgData.fields : [];
        const fgKey = `group_options_${menuSlug.replace(/-/g, '_')}_${String(fgData.slug || fg.title || 'fields').replace(/[^a-z0-9_]/gi, '_').toLowerCase()}`;
        
        const fgConfig = {
          key: fgKey,
          title: fg.title || `${pageTitle} Settings`,
          fields: fields.map((f: Record<string, unknown>, idx: number) => ({
            key: `field_${fgKey}_${String(f.name || `field_${idx}`).replace(/[^a-z0-9_]/gi, '_')}`,
            label: f.label || '',
            name: f.name || '',
            type: f.type || 'text',
            instructions: f.description || f.instructions || '',
            required: f.required || 0,
            ...(f.choices ? { choices: f.choices } : {}),
            ...(f.default_value !== undefined ? { default_value: f.default_value } : {}),
          })),
          location: [[
            { param: 'options_page', operator: '==', value: menuSlug }
          ]],
          position: fgData.position || 'normal',
          style: fgData.style || 'default',
          active: true,
        };

        code += `

/**
 * Field Group: ${fg.title}
 */
add_action('rdcfe/include_fields', function() {
    if (!function_exists('rdcfe_add_local_field_group')) {
        return;
    }

    rdcfe_add_local_field_group(${toPhpArray(fgConfig, 1)});
});`;
      });
    }

    return code;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(phpCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!', description: 'PHP code copied to clipboard.' });
    } catch {
      toast({ title: 'Failed to copy', description: 'Please select and copy manually.', variant: 'destructive' });
    }
  };

  const downloadPHP = () => {
    const item = allItems.find(i => i.id === selectedPHP);
    const filename = `${item?.slug || 'export'}.php`;
    
    const blob = new Blob([phpCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const itemsByType = {
    post_type: allItems.filter(i => i.type === 'post_type'),
    taxonomy: allItems.filter(i => i.type === 'taxonomy'),
    field_group: allItems.filter(i => i.type === 'field_group'),
    options_page: allItems.filter(i => i.type === 'options_page'),
  };

  // Render Tools content
  const renderToolsContent = () => {
    const toolsTabs = [
      { id: 'export' as const, label: 'Export', icon: Download },
      { id: 'import' as const, label: 'Import', icon: Upload },
      ...(isPro ? [{ id: 'snapshots' as const, label: 'Snapshots', icon: History }] : []),
      { id: 'php' as const, label: 'Generate PHP', icon: Code },
    ];

    return (
      <div className="rdcfe-space-y-6">
        {/* Tools Tabs */}
        <div className="rdcfe-flex rdcfe-gap-1 rdcfe-border-b rdcfe-border-gray-200">
          {toolsTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setToolsTab(tab.id)}
                className={`rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-4 rdcfe-py-2.5 rdcfe-text-sm rdcfe-font-medium rdcfe-border-b-2 rdcfe-transition-colors ${
                  toolsTab === tab.id
                    ? 'rdcfe-border-indigo-500 rdcfe-text-indigo-600'
                    : 'rdcfe-border-transparent rdcfe-text-gray-500 hover:rdcfe-text-gray-700'
                }`}
              >
                <Icon className="rdcfe-h-4 rdcfe-w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {isLoadingItems ? (
          <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-py-12">
            <Loader2 className="rdcfe-h-8 rdcfe-w-8 rdcfe-animate-spin rdcfe-text-indigo-500" />
          </div>
        ) : (
          <>
            {/* Export Tab */}
            {toolsTab === 'export' && (
              <div className="rdcfe-space-y-4">
                {/* Export Header */}
                <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-justify-between rdcfe-gap-4 rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-5 rdcfe-py-4">
                  <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
                    <div className="rdcfe-flex rdcfe-h-10 rdcfe-w-10 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-lg rdcfe-bg-indigo-50">
                      <Download className="rdcfe-h-5 rdcfe-w-5 rdcfe-text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="rdcfe-text-sm rdcfe-font-semibold rdcfe-text-gray-900">Export Configurations</h3>
                      <p className="rdcfe-text-xs rdcfe-text-gray-500">Select items to export as JSON file</p>
                    </div>
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={isExporting || selectedExport.size === 0}
                    className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-bg-indigo-500 rdcfe-px-5 rdcfe-py-2.5 rdcfe-text-sm rdcfe-font-medium rdcfe-text-white hover:rdcfe-bg-indigo-600 rdcfe-transition-colors disabled:rdcfe-opacity-50 disabled:rdcfe-cursor-not-allowed rdcfe-shadow-sm"
                  >
                    {isExporting ? <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" /> : <Download className="rdcfe-h-4 rdcfe-w-4" />}
                    Export {selectedExport.size > 0 ? `(${selectedExport.size} items)` : ''}
                  </button>
                </div>

                {/* Export Grid - 4 columns layout */}
                <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-2 xl:rdcfe-grid-cols-4 rdcfe-gap-4">
                  {(Object.entries(itemsByType) as [keyof typeof itemsByType, ConfigItem[]][]).map(([type, items]) => {
                    if (items.length === 0) return null;
                    
                    const Icon = typeIcons[type];
                    const allSelected = items.every(item => selectedExport.has(item.id));
                    const someSelected = items.some(item => selectedExport.has(item.id));
                    const selectedCount = items.filter(item => selectedExport.has(item.id)).length;
                    
                    return (
                      <div key={type} className="rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-overflow-hidden">
                        {/* Type Header */}
                        <button
                          onClick={() => handleSelectAllExport(type)}
                          className="rdcfe-w-full rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-px-4 rdcfe-py-3 rdcfe-bg-gray-50 rdcfe-border-b rdcfe-border-gray-100 hover:rdcfe-bg-gray-100 rdcfe-transition-colors rdcfe-group"
                        >
                          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5">
                            <span className={`rdcfe-flex rdcfe-h-5 rdcfe-w-5 rdcfe-items-center rdcfe-justify-center rdcfe-rounded rdcfe-border rdcfe-transition-colors ${
                              allSelected
                                ? 'rdcfe-bg-indigo-500 rdcfe-border-indigo-500'
                                : someSelected
                                  ? 'rdcfe-bg-indigo-100 rdcfe-border-indigo-300'
                                  : 'rdcfe-border-gray-300 group-hover:rdcfe-border-gray-400'
                            }`}>
                              {(allSelected || someSelected) && (
                                <Check className={`rdcfe-h-3 rdcfe-w-3 ${allSelected ? 'rdcfe-text-white' : 'rdcfe-text-indigo-500'}`} />
                              )}
                            </span>
                            <Icon className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-gray-500" />
                            <span className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-700">{typeLabels[type]}</span>
                          </div>
                          <span className={`rdcfe-text-xs rdcfe-font-medium rdcfe-px-2 rdcfe-py-0.5 rdcfe-rounded-full ${
                            selectedCount > 0 
                              ? 'rdcfe-bg-indigo-100 rdcfe-text-indigo-700' 
                              : 'rdcfe-bg-gray-100 rdcfe-text-gray-500'
                          }`}>
                            {selectedCount > 0 ? `${selectedCount}/` : ''}{items.length}
                          </span>
                        </button>
                        
                        {/* Items List */}
                        <div className="rdcfe-divide-y rdcfe-divide-gray-50 rdcfe-max-h-[260px] rdcfe-overflow-y-auto">
                          {items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleSelectExport(item.id)}
                              className={`rdcfe-w-full rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-px-4 rdcfe-py-2.5 rdcfe-text-left rdcfe-transition-colors ${
                                selectedExport.has(item.id) ? 'rdcfe-bg-indigo-50' : 'hover:rdcfe-bg-gray-50'
                              }`}
                            >
                              <span className={`rdcfe-flex rdcfe-h-4 rdcfe-w-4 rdcfe-shrink-0 rdcfe-items-center rdcfe-justify-center rdcfe-rounded rdcfe-border rdcfe-transition-colors ${
                                selectedExport.has(item.id)
                                  ? 'rdcfe-bg-indigo-500 rdcfe-border-indigo-500'
                                  : 'rdcfe-border-gray-300'
                              }`}>
                                {selectedExport.has(item.id) && <Check className="rdcfe-h-2.5 rdcfe-w-2.5 rdcfe-text-white" />}
                              </span>
                              <div className="rdcfe-min-w-0 rdcfe-flex-1">
                                <p className="rdcfe-text-sm rdcfe-text-gray-700 rdcfe-truncate">{item.title}</p>
                                <p className="rdcfe-text-xs rdcfe-text-gray-400 rdcfe-truncate">{item.slug}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Import Tab */}
            {toolsTab === 'import' && (
              <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-p-6">
                {!importFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`rdcfe-flex rdcfe-flex-col rdcfe-items-center rdcfe-justify-center rdcfe-rounded-lg rdcfe-border-2 rdcfe-border-dashed rdcfe-p-12 rdcfe-transition-colors ${
                      isDragging ? 'rdcfe-border-indigo-400 rdcfe-bg-indigo-50' : 'rdcfe-border-gray-200 rdcfe-bg-gray-50'
                    }`}
                  >
                    <FileJson className="rdcfe-h-12 rdcfe-w-12 rdcfe-text-gray-400 rdcfe-mb-4" />
                    <p className="rdcfe-text-sm rdcfe-text-gray-600 rdcfe-text-center rdcfe-mb-2">Drag and drop a JSON file here</p>
                    <p className="rdcfe-text-xs rdcfe-text-gray-400 rdcfe-mb-4">or</p>
                    <input ref={fileInputRef} type="file" accept=".json" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="rdcfe-hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-700 hover:rdcfe-bg-gray-50">
                      <Upload className="rdcfe-h-4 rdcfe-w-4" />
                      Browse files
                    </button>
                  </div>
                ) : (
                  <div className="rdcfe-space-y-4">
                    <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-p-4 rdcfe-bg-gray-50 rdcfe-rounded-lg">
                      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
                        <FileJson className="rdcfe-h-6 rdcfe-w-6 rdcfe-text-indigo-500" />
                        <div>
                          <p className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-900">{importFile.name}</p>
                          <p className="rdcfe-text-xs rdcfe-text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button onClick={handleClearImport} className="rdcfe-p-1 rdcfe-text-gray-400 hover:rdcfe-text-gray-600">
                        <X className="rdcfe-h-5 rdcfe-w-5" />
                      </button>
                    </div>

                    {isValidating && (
                      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-sm rdcfe-text-gray-600">
                        <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
                        Validating...
                      </div>
                    )}

                    {importResult && (
                      <div className="rdcfe-space-y-4">
                        <div className={`rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-p-3 rdcfe-rounded-lg ${importResult.validation.valid ? 'rdcfe-bg-green-50 rdcfe-text-green-700' : 'rdcfe-bg-red-50 rdcfe-text-red-700'}`}>
                          {importResult.validation.valid ? (
                            <><CheckCircle className="rdcfe-h-5 rdcfe-w-5" /><span className="rdcfe-font-medium">Validation passed - Ready to import</span></>
                          ) : (
                            <><AlertCircle className="rdcfe-h-5 rdcfe-w-5" /><span className="rdcfe-font-medium">Validation failed</span></>
                          )}
                        </div>

                        {importResult.validation.valid && importResult.validation.valid_items && (
                          <div className="rdcfe-text-sm rdcfe-text-gray-600 rdcfe-p-3 rdcfe-bg-gray-50 rdcfe-rounded-lg">
                            <strong>Items to import:</strong>{' '}
                            {Object.entries(importResult.validation.valid_items)
                              .filter(([, count]) => count > 0)
                              .map(([type, count]) => `${count} ${typeLabels[type as keyof typeof typeLabels] || type}`)
                              .join(', ')}
                          </div>
                        )}

                        {importResult.validation.errors.length > 0 && (
                          <div className="rdcfe-space-y-2">
                            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-text-sm rdcfe-font-medium rdcfe-text-red-700">
                              <AlertCircle className="rdcfe-h-4 rdcfe-w-4" /> Errors
                            </div>
                            <ul className="rdcfe-text-sm rdcfe-text-red-600 rdcfe-space-y-1 rdcfe-pl-5 rdcfe-list-disc">
                              {importResult.validation.errors.map((error, i) => <li key={i}>{error.message}</li>)}
                            </ul>
                          </div>
                        )}

                        {importResult.validation.warnings.length > 0 && (
                          <div className="rdcfe-space-y-2">
                            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-text-sm rdcfe-font-medium rdcfe-text-amber-700">
                              <AlertTriangle className="rdcfe-h-4 rdcfe-w-4" /> Warnings
                            </div>
                            <ul className="rdcfe-text-sm rdcfe-text-amber-600 rdcfe-space-y-1 rdcfe-pl-5 rdcfe-list-disc">
                              {importResult.validation.warnings.map((warning, i) => <li key={i}>{warning.message}</li>)}
                            </ul>
                          </div>
                        )}

                        {isPro &&
                          importDiff &&
                          importDiff.success &&
                          importDiff.validation.valid &&
                          importFile && (
                            <DiffPreview
                              fileLabel={importFile.name}
                              items={importDiff.items}
                              summary={importDiff.summary}
                              resolutions={importResolutions}
                              onResolutionsChange={setImportResolutions}
                              typeLabels={typeLabels}
                              createSnapshot={createSnapshotBeforeImport}
                              onCreateSnapshotChange={setCreateSnapshotBeforeImport}
                            />
                          )}

                        {importResult.validation.valid && importResult.dry_run && (
                          <button onClick={handleImport} disabled={isImporting} className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-bg-emerald-500 rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-white hover:rdcfe-bg-emerald-600 rdcfe-transition-colors disabled:rdcfe-opacity-50">
                            {isImporting ? <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" /> : <Upload className="rdcfe-h-4 rdcfe-w-4" />}
                            {isPro ? 'Import with changes' : 'Import Now'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {toolsTab === 'snapshots' && isPro && <RollbackPanel />}

            {/* PHP Generation Tab */}
            {toolsTab === 'php' && (
              <div className="rdcfe-space-y-4">
                {/* PHP Generation Header */}
                <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-justify-between rdcfe-gap-4 rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-5 rdcfe-py-4">
                  <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
                    <div className="rdcfe-flex rdcfe-h-10 rdcfe-w-10 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-lg rdcfe-bg-emerald-50">
                      <Code className="rdcfe-h-5 rdcfe-w-5 rdcfe-text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="rdcfe-text-sm rdcfe-font-semibold rdcfe-text-gray-900">Generate PHP Code</h3>
                      <p className="rdcfe-text-xs rdcfe-text-gray-500">
                        Export configurations as PHP code for theme/plugin
                        <span className="rdcfe-ml-2 rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1 rdcfe-text-amber-600">
                          <AlertTriangle className="rdcfe-h-3 rdcfe-w-3" />
                          Requires RDCFE plugin
                        </span>
                      </p>
                    </div>
                  </div>
                  {phpCode && (
                    <div className="rdcfe-flex rdcfe-gap-2">
                      <button 
                        onClick={copyToClipboard} 
                        className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-700 hover:rdcfe-bg-gray-50 rdcfe-transition-colors rdcfe-shadow-sm"
                      >
                        {copied ? <Check className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-green-500" /> : <Copy className="rdcfe-h-4 rdcfe-w-4" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <button 
                        onClick={downloadPHP} 
                        className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-bg-emerald-500 rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-white hover:rdcfe-bg-emerald-600 rdcfe-transition-colors rdcfe-shadow-sm"
                      >
                        <Download className="rdcfe-h-4 rdcfe-w-4" />
                        Download
                      </button>
                    </div>
                  )}
                </div>

                {/* PHP Generation Grid - Selector and Code */}
                <div className="rdcfe-grid rdcfe-grid-cols-1 lg:rdcfe-grid-cols-12 rdcfe-gap-4">
                  {/* Item Selector - 4 columns on large screens */}
                  <div className="lg:rdcfe-col-span-4 xl:rdcfe-col-span-3 rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-overflow-hidden">
                    <div className="rdcfe-px-4 rdcfe-py-3 rdcfe-bg-gray-50 rdcfe-border-b rdcfe-border-gray-100">
                      <p className="rdcfe-text-xs rdcfe-font-medium rdcfe-text-gray-500 rdcfe-uppercase rdcfe-tracking-wider">Select Item</p>
                    </div>
                    
                    <div className="rdcfe-divide-y rdcfe-divide-gray-100 rdcfe-max-h-[450px] rdcfe-overflow-y-auto">
                      {(Object.entries(itemsByType) as [keyof typeof itemsByType, ConfigItem[]][]).map(([type, items]) => {
                        if (items.length === 0) return null;
                        const Icon = typeIcons[type];
                        
                        return (
                          <div key={type} className="rdcfe-py-2">
                            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-4 rdcfe-py-2">
                              <Icon className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-gray-400" />
                              <span className="rdcfe-text-xs rdcfe-font-semibold rdcfe-text-gray-500 rdcfe-uppercase rdcfe-tracking-wider">{typeLabels[type]}</span>
                            </div>
                            
                            <div className="rdcfe-space-y-0.5 rdcfe-px-2">
                              {items.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => generatePHPCode(item)}
                                  className={`rdcfe-w-full rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-px-3 rdcfe-py-2 rdcfe-rounded-lg rdcfe-text-left rdcfe-transition-all ${
                                    selectedPHP === item.id 
                                      ? 'rdcfe-bg-emerald-50 rdcfe-text-emerald-700 rdcfe-ring-1 rdcfe-ring-emerald-200' 
                                      : 'hover:rdcfe-bg-gray-50 rdcfe-text-gray-600'
                                  }`}
                                >
                                  <div className="rdcfe-min-w-0 rdcfe-flex-1">
                                    <p className="rdcfe-text-sm rdcfe-truncate">{item.title}</p>
                                    <p className="rdcfe-text-xs rdcfe-text-gray-400 rdcfe-truncate">{item.slug}</p>
                                  </div>
                                  {isGenerating && selectedPHP === item.id && (
                                    <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin rdcfe-text-emerald-500 rdcfe-ml-2" />
                                  )}
                                  {!isGenerating && selectedPHP === item.id && (
                                    <Check className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-emerald-500 rdcfe-ml-2" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Code Display - 8 columns on large screens */}
                  <div className="lg:rdcfe-col-span-8 xl:rdcfe-col-span-9 rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-overflow-hidden">
                    <div className="rdcfe-px-4 rdcfe-py-3 rdcfe-bg-gray-50 rdcfe-border-b rdcfe-border-gray-100 rdcfe-flex rdcfe-items-center rdcfe-justify-between">
                      <p className="rdcfe-text-xs rdcfe-font-medium rdcfe-text-gray-500 rdcfe-uppercase rdcfe-tracking-wider">
                        {selectedPHP ? `PHP Code for: ${allItems.find(i => i.id === selectedPHP)?.title || 'Selected Item'}` : 'PHP Code Output'}
                      </p>
                      {phpCode && (
                        <span className="rdcfe-text-xs rdcfe-text-gray-400">
                          {phpCode.split('\n').length} lines
                        </span>
                      )}
                    </div>
                    
                    <div className="rdcfe-max-h-[450px] rdcfe-overflow-auto">
                      {phpCode ? (
                        <pre className="rdcfe-text-xs rdcfe-font-mono rdcfe-text-gray-700 rdcfe-whitespace-pre rdcfe-p-4 rdcfe-bg-slate-900 rdcfe-text-slate-100 rdcfe-leading-relaxed">{phpCode}</pre>
                      ) : (
                        <div className="rdcfe-flex rdcfe-flex-col rdcfe-items-center rdcfe-justify-center rdcfe-py-20 rdcfe-text-gray-400">
                          <div className="rdcfe-flex rdcfe-h-16 rdcfe-w-16 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-full rdcfe-bg-gray-100 rdcfe-mb-4">
                            <Code className="rdcfe-h-8 rdcfe-w-8" />
                          </div>
                          <p className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-600">No code generated</p>
                          <p className="rdcfe-text-xs rdcfe-text-gray-400 rdcfe-mt-1">Select an item from the left panel</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  /**
   * Render the "AI Assistant" tab.
   *
   * Three nested cards: enable toggle + masked API key + model picker.
   * The whole pane is wrapped in `<ProOverlay />` for Free users so the
   * UI stays available for inspection but cannot accidentally hit the
   * REST endpoints (which are 403'd anyway).
   */
  const renderAiAssistantContent = () => {
    const hasKey = Boolean(aiSettings?.has_api_key);
    const enabled = Boolean(aiSettings?.enabled);
    const allowedModels = aiSettings?.allowed_models ?? [];
    const activeModel = aiSettings?.model ?? '';
    const rateLimit = aiSettings?.rate_limit_per_hour ?? 30;
    const draft = aiApiKeyDraft;
    const showSavedPreview = hasKey && !aiKeyEditing;
    const apiKeyInputValue = aiKeyEditing ? draft : hasKey ? SAVED_API_KEY_MASK_DISPLAY : '';
    const draftIsDirty = aiKeyEditing && aiKeyTouched && draft.trim().length > 0;
    const aiSettingsReady = aiSettings !== null;
    const apiInputDisabled = !isPro || isSavingAi || (isLoadingAiSettings && !aiSettingsReady);

    return (
      <div className="rdcfe-relative">
        {!isPro && <ProOverlay />}
        <div className={`rdcfe-space-y-6 ${!isPro ? 'rdcfe-opacity-50' : ''}`}>
          <SettingsCard icon={Bot} title="OpenAI Integration" description="Power the AI Assistant with your own OpenAI API key.">
            <div className="rdcfe-divide-y rdcfe-divide-gray-100">
              <SettingRow
                title="Enable AI Assistant"
                description="Allow the plugin to call the OpenAI API to generate schemas, fields, and queries."
              >
                {isLoadingAiSettings ? (
                  <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin rdcfe-text-gray-400" />
                ) : (
                  <Toggle
                    checked={enabled}
                    onChange={handleAiToggleEnabled}
                    disabled={!isPro || isSavingAi || (!hasKey && !enabled)}
                  />
                )}
              </SettingRow>

              <div className="rdcfe-py-4">
                <div className="rdcfe-flex rdcfe-items-start rdcfe-justify-between rdcfe-gap-4">
                  <div className="rdcfe-flex-1">
                    <h4 className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-900">
                      <Key className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-indigo-500" />
                      API Key
                    </h4>
                    <p className="rdcfe-mt-0.5 rdcfe-text-sm rdcfe-text-gray-500">
                      Paste your OpenAI secret key. We store it on your site only — never sent to anyone but OpenAI.
                    </p>
                  </div>
                  {hasKey && showSavedPreview && (
                    <span className="rdcfe-inline-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-gap-2">
                      <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1 rdcfe-rounded-full rdcfe-bg-emerald-50 rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-xs rdcfe-font-medium rdcfe-text-emerald-700">
                        <Check className="rdcfe-h-3 rdcfe-w-3" />
                        Saved
                      </span>
                      <button
                        type="button"
                        onClick={handleAiApiKeyBeginChange}
                        disabled={!isPro || isSavingAi}
                        className="rdcfe-text-xs rdcfe-font-medium rdcfe-text-indigo-600 hover:rdcfe-text-indigo-800 hover:rdcfe-underline disabled:rdcfe-cursor-not-allowed disabled:rdcfe-opacity-50 disabled:rdcfe-no-underline"
                      >
                        Change key
                      </button>
                    </span>
                  )}
                </div>

                <div className="rdcfe-mt-3 rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                  <div className="rdcfe-relative rdcfe-flex-1">
                    <input
                      type={showSavedPreview ? 'text' : aiKeyVisible ? 'text' : 'password'}
                      readOnly={showSavedPreview}
                      placeholder={
                        isLoadingAiSettings && !aiSettingsReady
                          ? 'Loading…'
                          : showSavedPreview
                            ? ''
                            : hasKey
                              ? 'Paste new API key…'
                              : 'sk-...'
                      }
                      disabled={apiInputDisabled}
                      value={apiKeyInputValue}
                      onChange={(e) => {
                        setAiApiKeyDraft(e.target.value);
                        setAiKeyTouched(true);
                      }}
                      aria-readonly={showSavedPreview}
                      className={`rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-px-3 rdcfe-py-2 rdcfe-pr-10 rdcfe-text-sm rdcfe-font-mono focus:rdcfe-border-indigo-300 focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-indigo-500/20 disabled:rdcfe-cursor-not-allowed disabled:rdcfe-bg-gray-50 disabled:rdcfe-text-gray-400 ${showSavedPreview ? 'rdcfe-cursor-default rdcfe-bg-gray-50 rdcfe-text-gray-700' : 'rdcfe-bg-white'}`}
                    />
                    <button
                      type="button"
                      aria-label={aiKeyVisible ? 'Hide API key' : 'Show API key'}
                      onClick={() => setAiKeyVisible((v) => !v)}
                      disabled={apiInputDisabled || showSavedPreview}
                      className="rdcfe-absolute rdcfe-right-2 rdcfe-top-1/2 -rdcfe-translate-y-1/2 rdcfe-flex rdcfe-h-6 rdcfe-w-6 rdcfe-items-center rdcfe-justify-center rdcfe-rounded rdcfe-text-gray-400 hover:rdcfe-bg-gray-100 hover:rdcfe-text-gray-600 disabled:rdcfe-opacity-50"
                    >
                      {aiKeyVisible ? <EyeOff className="rdcfe-h-4 rdcfe-w-4" /> : <Eye className="rdcfe-h-4 rdcfe-w-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiApiKeySave}
                    disabled={!isPro || isSavingAi || !draftIsDirty}
                    className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-bg-indigo-500 rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-white hover:rdcfe-bg-indigo-600 rdcfe-transition-colors disabled:rdcfe-cursor-not-allowed disabled:rdcfe-opacity-50"
                  >
                    {isSavingAi ? <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" /> : <Save className="rdcfe-h-4 rdcfe-w-4" />}
                    Save Key
                  </button>
                  {hasKey && (
                    <button
                      type="button"
                      onClick={handleAiApiKeyClear}
                      disabled={!isPro || isSavingAi}
                      className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-3 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-600 hover:rdcfe-bg-gray-50 rdcfe-transition-colors disabled:rdcfe-opacity-50"
                      title="Remove the saved API key"
                    >
                      <Trash2 className="rdcfe-h-4 rdcfe-w-4" />
                    </button>
                  )}
                </div>

                <p className="rdcfe-mt-2 rdcfe-text-xs rdcfe-text-gray-400">
                  Get a key at{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rdcfe-text-indigo-500 hover:rdcfe-underline"
                  >
                    platform.openai.com
                  </a>
                  . Keys typically start with <code className="rdcfe-rounded rdcfe-bg-gray-100 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-font-mono rdcfe-text-[11px]">sk-</code>.
                </p>
              </div>

              <div className="rdcfe-py-4">
                <div className="rdcfe-flex rdcfe-items-start rdcfe-justify-between rdcfe-gap-4">
                  <div className="rdcfe-flex-1">
                    <h4 className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-900">
                      <Cpu className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-indigo-500" />
                      Model
                    </h4>
                    <p className="rdcfe-mt-0.5 rdcfe-text-sm rdcfe-text-gray-500">
                      Pick the OpenAI model the AI Assistant should use. For low cost try{' '}
                      <code className="rdcfe-rounded rdcfe-bg-gray-100 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-font-mono rdcfe-text-[11px]">gpt-5.4-nano</code>
                      ,{' '}
                      <code className="rdcfe-rounded rdcfe-bg-gray-100 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-font-mono rdcfe-text-[11px]">gpt-5-nano</code>
                      , or{' '}
                      <code className="rdcfe-rounded rdcfe-bg-gray-100 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-font-mono rdcfe-text-[11px]">gpt-5.4-mini</code>{' '}
                      if your key has access; otherwise{' '}
                      <code className="rdcfe-rounded rdcfe-bg-gray-100 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-font-mono rdcfe-text-[11px]">gpt-4o-mini</code>{' '}
                      remains a safe default. See{' '}
                      <a
                        href="https://developers.openai.com/api/docs/models/all"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rdcfe-text-indigo-500 hover:rdcfe-underline"
                      >
                        OpenAI model list
                      </a>
                      .
                    </p>
                  </div>
                </div>
                <select
                  value={activeModel}
                  onChange={(e) => handleAiModelChange(e.target.value)}
                  disabled={!isPro || isSavingAi || allowedModels.length === 0}
                  className="rdcfe-mt-3 rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-3 rdcfe-py-2 rdcfe-text-sm focus:rdcfe-border-indigo-300 focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-indigo-500/20 disabled:rdcfe-bg-gray-50 disabled:rdcfe-text-gray-400"
                >
                  {allowedModels.length === 0 && (
                    <option value="">Loading models…</option>
                  )}
                  {allowedModels.map((slug) => (
                    <option key={slug} value={slug}>
                      {slug}
                    </option>
                  ))}
                </select>
              </div>

              <SettingRow
                title="Rate limit"
                description="Maximum AI generations per hour, per WordPress user. Prevents runaway API spend."
              >
                <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1 rdcfe-rounded-md rdcfe-bg-gray-100 rdcfe-px-2 rdcfe-py-1 rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-700">
                  {rateLimit}/hour
                </span>
              </SettingRow>
            </div>
          </SettingsCard>

          {hasKey && enabled && (
            <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-emerald-200 rdcfe-bg-emerald-50 rdcfe-p-4">
              <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-3">
                <CheckCircle className="rdcfe-mt-0.5 rdcfe-h-5 rdcfe-w-5 rdcfe-flex-shrink-0 rdcfe-text-emerald-600" />
                <div>
                  <p className="rdcfe-text-sm rdcfe-font-semibold rdcfe-text-emerald-900">AI Assistant is ready</p>
                  <p className="rdcfe-mt-0.5 rdcfe-text-sm rdcfe-text-emerald-800">
                    Open the AI Assistant page from the More menu (or the per-module "Generate with AI" buttons) to start generating schemas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!hasKey && enabled && (
            <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-amber-200 rdcfe-bg-amber-50 rdcfe-p-4">
              <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-3">
                <AlertTriangle className="rdcfe-mt-0.5 rdcfe-h-5 rdcfe-w-5 rdcfe-flex-shrink-0 rdcfe-text-amber-600" />
                <div>
                  <p className="rdcfe-text-sm rdcfe-font-semibold rdcfe-text-amber-900">API key required</p>
                  <p className="rdcfe-mt-0.5 rdcfe-text-sm rdcfe-text-amber-800">
                    Add your OpenAI API key above before the AI Assistant can generate anything.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Render the "License" tab.
   *
   * Activation surface for the Pro plugin. Only ever reached when `isPro`
   * is true (the sidebar entry + the `case 'license'` below are gated), so
   * unlike the AI tab there is no Pro overlay — the routes exist whenever
   * this renders.
   */
  const renderLicenseContent = () => {
    const isActive = licenseStatus?.status === 'valid';
    const maskedKey = licenseStatus?.masked_key ?? '';
    const busy = isActivatingLicense || isDeactivatingLicense;
    const draftValid = licenseKeyDraft.trim().length > 0;
    const initialLoading = isLoadingLicense && licenseStatus === null;

    return (
      <div className="rdcfe-space-y-6">
        {!isActive && !initialLoading && (
          <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-amber-200 rdcfe-bg-amber-50 rdcfe-p-4">
            <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-3">
              <AlertTriangle className="rdcfe-mt-0.5 rdcfe-h-5 rdcfe-w-5 rdcfe-flex-shrink-0 rdcfe-text-amber-600" />
              <div>
                <p className="rdcfe-text-sm rdcfe-font-semibold rdcfe-text-amber-900">License not active</p>
                <p className="rdcfe-mt-0.5 rdcfe-text-sm rdcfe-text-amber-800">
                  Activate your license below to enable automatic updates. Pro features keep working in the meantime.
                </p>
              </div>
            </div>
          </div>
        )}

        <SettingsCard
          icon={KeyRound}
          title="License Activation"
          description="Activate your license to unlock automatic updates and premium support."
        >
          <div className="rdcfe-divide-y rdcfe-divide-gray-100">
            <SettingRow
              title="License status"
              description="Whether this site is linked to an active license."
            >
              {initialLoading ? (
                <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin rdcfe-text-gray-400" />
              ) : isActive ? (
                <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-rounded-full rdcfe-bg-emerald-50 rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-xs rdcfe-font-medium rdcfe-text-emerald-700">
                  <ShieldCheck className="rdcfe-h-3.5 rdcfe-w-3.5" />
                  Active
                </span>
              ) : (
                <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-rounded-full rdcfe-bg-gray-100 rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-xs rdcfe-font-medium rdcfe-text-gray-600">
                  <AlertCircle className="rdcfe-h-3.5 rdcfe-w-3.5" />
                  Not active
                </span>
              )}
            </SettingRow>

            {isActive ? (
              /* Activated — no key field. The Deactivate action lives inside
                 a success notice that takes the field's place. */
              <div className="rdcfe-py-4">
                <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-emerald-200 rdcfe-bg-emerald-50 rdcfe-p-4">
                  <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-start rdcfe-justify-between rdcfe-gap-4">
                    <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-3">
                      <CheckCircle className="rdcfe-mt-0.5 rdcfe-h-5 rdcfe-w-5 rdcfe-flex-shrink-0 rdcfe-text-emerald-600" />
                      <div>
                        <p className="rdcfe-text-sm rdcfe-font-semibold rdcfe-text-emerald-900">License is active</p>
                        <p className="rdcfe-mt-0.5 rdcfe-text-sm rdcfe-text-emerald-800">
                          This site will receive automatic plugin updates and is eligible for premium support.
                        </p>
                        {maskedKey && (
                          <p className="rdcfe-mt-2 rdcfe-text-xs rdcfe-text-emerald-700">
                            Active key:{' '}
                            <code className="rdcfe-rounded rdcfe-bg-emerald-100 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-font-mono">{maskedKey}</code>
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeactivateLicense}
                      disabled={busy}
                      className="rdcfe-inline-flex rdcfe-flex-shrink-0 rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-border rdcfe-border-red-200 rdcfe-bg-white rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-red-600 hover:rdcfe-bg-red-50 rdcfe-transition-colors disabled:rdcfe-cursor-not-allowed disabled:rdcfe-opacity-50"
                    >
                      {isDeactivatingLicense ? <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" /> : <PowerOff className="rdcfe-h-4 rdcfe-w-4" />}
                      Deactivate
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Not activated — license key input + Activate button. */
              <div className="rdcfe-py-4">
                <div className="rdcfe-flex-1">
                  <h4 className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-900">
                    <Key className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-indigo-500" />
                    License key
                  </h4>
                  <p className="rdcfe-mt-0.5 rdcfe-text-sm rdcfe-text-gray-500">
                    Paste the license key from your{' '}
                    <a
                      href="https://wpmet.com/my-account/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rdcfe-text-indigo-500 hover:rdcfe-underline"
                    >
                      wpmet account
                    </a>
                    . We store it on your site only.
                  </p>
                </div>

                <div className="rdcfe-mt-3 rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                  <div className="rdcfe-relative rdcfe-flex-1">
                    <input
                      type={licenseKeyVisible ? 'text' : 'password'}
                      placeholder={initialLoading ? 'Loading…' : 'Paste your license key…'}
                      disabled={busy || initialLoading}
                      value={licenseKeyDraft}
                      onChange={(e) => setLicenseKeyDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && draftValid && !busy) {
                          void handleActivateLicense();
                        }
                      }}
                      className="rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-3 rdcfe-py-2 rdcfe-pr-10 rdcfe-text-sm rdcfe-font-mono focus:rdcfe-border-indigo-300 focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-indigo-500/20 disabled:rdcfe-cursor-not-allowed disabled:rdcfe-bg-gray-50 disabled:rdcfe-text-gray-400"
                    />
                    <button
                      type="button"
                      aria-label={licenseKeyVisible ? 'Hide license key' : 'Show license key'}
                      onClick={() => setLicenseKeyVisible((v) => !v)}
                      disabled={busy || initialLoading}
                      className="rdcfe-absolute rdcfe-right-2 rdcfe-top-1/2 -rdcfe-translate-y-1/2 rdcfe-flex rdcfe-h-6 rdcfe-w-6 rdcfe-items-center rdcfe-justify-center rdcfe-rounded rdcfe-text-gray-400 hover:rdcfe-bg-gray-100 hover:rdcfe-text-gray-600 disabled:rdcfe-opacity-50"
                    >
                      {licenseKeyVisible ? <EyeOff className="rdcfe-h-4 rdcfe-w-4" /> : <Eye className="rdcfe-h-4 rdcfe-w-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleActivateLicense}
                    disabled={busy || initialLoading || !draftValid}
                    className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-bg-indigo-500 rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-white hover:rdcfe-bg-indigo-600 rdcfe-transition-colors disabled:rdcfe-cursor-not-allowed disabled:rdcfe-opacity-50"
                  >
                    {isActivatingLicense ? <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" /> : <ShieldCheck className="rdcfe-h-4 rdcfe-w-4" />}
                    Activate
                  </button>
                </div>
              </div>
            )}
          </div>
        </SettingsCard>
      </div>
    );
  };

  // Render section content
  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="rdcfe-space-y-6">
            <SettingsCard icon={Settings2} title="Plugin Settings" description="Configure basic plugin behavior">
              <div className="rdcfe-divide-y rdcfe-divide-gray-100">
                <SettingRow title="Auto-flush Rewrite Rules" description="Automatically flush rewrite rules when CPTs or Taxonomies change">
                  <Toggle
                    checked={settings.autoFlushRewrite}
                    onChange={(checked) => setSettings(s => ({ ...s, autoFlushRewrite: checked }))}
                    disabled={isLoadingSettings}
                  />
                </SettingRow>
                <SettingRow title="Remove Data on Uninstall" description="Delete all plugin data when the plugin is uninstalled">
                  <Toggle
                    checked={settings.removeDataOnUninstall}
                    onChange={(checked) => setSettings(s => ({ ...s, removeDataOnUninstall: checked }))}
                    variant="danger"
                    disabled={isLoadingSettings}
                  />
                </SettingRow>
              </div>
            </SettingsCard>

            <SettingsCard icon={RefreshCw} title="Manual Actions" description="Perform manual maintenance tasks">
              <div className="rdcfe-py-4">
                <button onClick={handleFlushRewrite} disabled={isFlushing} className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-700 rdcfe-shadow-sm hover:rdcfe-bg-gray-50 rdcfe-transition-colors disabled:rdcfe-opacity-50">
                  {isFlushing ? <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" /> : <RefreshCw className="rdcfe-h-4 rdcfe-w-4" />}
                  Flush Rewrite Rules
                </button>
                <p className="rdcfe-mt-2 rdcfe-text-sm rdcfe-text-gray-500">Manually flush WordPress rewrite rules to update permalinks.</p>
              </div>
            </SettingsCard>
          </div>
        );

      case 'tools':
        return renderToolsContent();

      case 'ai-assistant':
        return renderAiAssistantContent();

      case 'license':
        return renderLicenseContent();

      default:
        return null;
    }
  };

  return (
    <div className="rdcfe-flex rdcfe-gap-6">
      {/* Sidebar */}
      <div className="rdcfe-w-64 rdcfe-flex-shrink-0">
        <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-p-4 rdcfe-sticky rdcfe-top-24">
          <div className="rdcfe-mb-4">
            <h2 className="rdcfe-text-base rdcfe-font-semibold rdcfe-text-gray-900">Settings</h2>
            <p className="rdcfe-text-sm rdcfe-text-gray-500">Configure your plugin</p>
          </div>
          
          <nav className="rdcfe-space-y-1">
            {(isPro ? [...sidebarItems, licenseSidebarItem] : sidebarItems).map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`rdcfe-flex rdcfe-w-full rdcfe-items-center rdcfe-gap-3 rdcfe-rounded-lg rdcfe-px-3 rdcfe-py-2.5 rdcfe-text-left rdcfe-transition-colors ${
                    isActive ? 'rdcfe-bg-indigo-50 rdcfe-text-indigo-700' : 'rdcfe-text-gray-600 hover:rdcfe-bg-gray-50'
                  }`}
                >
                  <Icon className={`rdcfe-h-4 rdcfe-w-4 ${isActive ? 'rdcfe-text-indigo-600' : 'rdcfe-text-gray-400'}`} />
                  <div className="rdcfe-flex-1">
                    <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                      <span className="rdcfe-text-sm rdcfe-font-medium">{item.label}</span>
                      {item.isPro && !isPro && <span className="rdcfe-text-[10px] rdcfe-bg-indigo-100 rdcfe-text-indigo-600 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-rounded rdcfe-font-medium">Pro</span>}
                    </div>
                    <span className={`rdcfe-text-xs ${isActive ? 'rdcfe-text-indigo-500' : 'rdcfe-text-gray-400'}`}>{item.description}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="rdcfe-flex-1">
        {renderContent()}
        
        {/* Save Button - Only for General */}
        {activeSection === 'general' && (
          <div className="rdcfe-mt-6 rdcfe-flex rdcfe-justify-end">
            <button onClick={handleSave} disabled={isSaving || isLoadingSettings} className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-bg-indigo-500 rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-white rdcfe-shadow-sm hover:rdcfe-bg-indigo-600 rdcfe-transition-colors disabled:rdcfe-opacity-50">
              {isSaving ? <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" /> : <Save className="rdcfe-h-4 rdcfe-w-4" />}
              Save Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
