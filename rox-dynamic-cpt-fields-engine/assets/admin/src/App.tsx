import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { PostTypes } from './pages/PostTypes';
import { PostTypeForm } from './pages/PostTypeForm';
import { Taxonomies } from './pages/Taxonomies';
import { TaxonomyForm } from './pages/TaxonomyForm';
import { Metaboxes } from './pages/Metaboxes';
import { MetaboxForm } from './pages/MetaboxForm';
import { OptionsPages } from './pages/OptionsPages';
import { OptionsPageForm } from './pages/OptionsPageForm';
import { Queries } from './pages/Queries';
import { QueryForm } from './pages/QueryForm';
import { Listings } from './pages/Listings';
import { ListingTemplateForm } from './pages/ListingTemplateForm';
import { ListingPageForm } from './pages/ListingPageForm';
import { ListingGridForm } from './pages/ListingGridForm';
import { Relations } from './pages/Relations';
import { RelationForm } from './pages/RelationForm';
import { AIAssistant } from './pages/AIAssistant';
import { Settings } from './pages/Settings';
import { Toaster } from './components/ui/toaster';
import { NotificationToastProvider } from './components/ui/notification-toast';
import { ProProvider } from './contexts/ProContext';

export function App() {
  return (
    <ProProvider>
      <NotificationToastProvider>
        <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            
            {/* Post Types */}
            <Route path="/post-types" element={<PostTypes />} />
            <Route path="/post-types/new" element={<PostTypeForm />} />
            <Route path="/post-types/:id" element={<PostTypeForm />} />
            
            {/* Taxonomies */}
            <Route path="/taxonomies" element={<Taxonomies />} />
            <Route path="/taxonomies/new" element={<TaxonomyForm />} />
            <Route path="/taxonomies/:id" element={<TaxonomyForm />} />
            
            {/* Metaboxes */}
            <Route path="/metaboxes" element={<Metaboxes />} />
            <Route path="/metaboxes/new" element={<MetaboxForm />} />
            <Route path="/metaboxes/:id" element={<MetaboxForm />} />
            
            {/* Options Pages */}
            <Route path="/options-pages" element={<OptionsPages />} />
            <Route path="/options-pages/new" element={<OptionsPageForm />} />
            <Route path="/options-pages/:id" element={<OptionsPageForm />} />

            {/* Query Builder  */}
            <Route path="/queries" element={<Queries />} />
            <Route path="/queries/new" element={<QueryForm />} />
            <Route path="/queries/:id" element={<QueryForm />} />

            {/* Listings (Pro - Steps 28 + 29 + 45) */}
            <Route path="/listings" element={<Listings />} />
            <Route path="/listings/template/new" element={<ListingTemplateForm />} />
            <Route path="/listings/template/:id" element={<ListingTemplateForm />} />
            <Route path="/listings/grid/new" element={<ListingGridForm />} />
            <Route path="/listings/grid/:id" element={<ListingGridForm />} />
            {/* Page templates — RDCFE builder or external-editor settings */}
            <Route path="/listings/page/new" element={<ListingPageForm />} />
            <Route path="/listings/page/:id" element={<ListingPageForm />} />

            {/* Relations (Pro - Steps 31 + 32) */}
            <Route path="/relations" element={<Relations />} />
            <Route path="/relations/new" element={<RelationForm />} />
            <Route path="/relations/:id" element={<RelationForm />} />

            {/* AI Assistant (Pro - Step 34) */}
            <Route path="/ai-assistant" element={<AIAssistant />} />

            {/* Tools - Redirect to Settings */}
            <Route path="/tools" element={<Navigate to="/settings" replace />} />
            
            {/* Settings (includes Tools) */}
            <Route path="/settings" element={<Settings />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
          <Toaster />
        </HashRouter>
      </NotificationToastProvider>
    </ProProvider>
  );
}

