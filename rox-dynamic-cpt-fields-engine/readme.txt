=== Dynamic Fields Engine - Custom post types, Custom fields, Meta fields, Taxonomies, Listing builder, Query builder and Relations ===
Contributors: ataurr
Tags: custom post types, custom fields, meta fields, taxonomies, dynamic content,
Requires at least: 6.5
Tested up to: 7.0
Stable tag: 1.0.7
Requires PHP: 8.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Build Custom post types, Custom fields, Meta fields, and taxonomies. AI-powered schema generation. Dynamic content listings and meta fields included.

== Description ==

**Dynamic Fields Engine (DFE)** is a modern WordPress CPT plugin designed for teams that want advanced website content architecture without writing PHP. Built by the team behind Wpmet - serving over 3 million WordPress users.

This CPT plugin allows users to create custom post types, custom taxonomies, meta fields, options pages, and global settings from a clean one-stop hub. Where users can extend their content structure capabilities through saved queries, frontend listing templates, and post relationships.

DFE is an AI-powered custom post type plugin. It’s AI Assistant drafts and reviews schemas from users before deploying them to ensure that each configuration is validated, exportable, and protects custom post types in WordPress.
  

## Key Features

-   **One admin. Full content model:** Custom post types, taxonomies, field groups, and options pages, all from a single React SPA interface.
    
-   **26 free field types:** Text, textarea, number, email, URL, date, time, date & time, color, select, checkbox, radio, toggle, image, file, and WYSIWYG, no Pro needed for core data.
    
-   **Import / export with rollback:** JSON export/import with diff preview and snapshot rollback, the most robust config portability of any free CPT plugin.
    
-   **PHP Registration API:** Register post types, taxonomies, and field groups via PHP for theme or plugin distribution and version-controlled workflows.
    
-   **REST-first config API:** All admin settings are backed by REST endpoints with capability middleware, enabling CI/CD, headless, and programmatic management.
    
-   **Built-in Schema validation:** Every configuration is validated against formal rules before it is applied, with structured error messages and rollback on failure.
    
-   **AI Assistant:** Describe your content model in plain language. DFE generates the full schema, like CPTs, taxonomies, fields, queries, listings, and relations, in seconds.
  

## Custom Post Types

Get a visual interface to create and manage custom post types without touching functions.php. Control labels, supports, REST visibility, archive behavior, permalink slugs, capability type, and menu placement. Then, you can attach multiple taxonomies and meta field groups directly from the post type editor.

Plus, export any post type configuration to PHP with one click from Settings → Tools → PHP Generation and drop it into a theme or plugin for version-controlled deployments.

  

-   **Basic settings:** Plural/singular labels, slug, description, menu icon, menu position
    
-   **Labels tab:** Customize every WordPress admin string (Add New, Edit Item, Featured Image, Archives, and more)
    
-   **Inline meta fields:** Attach fields directly to a post type for fast setup without a separate metabox
    
-   **Advanced settings:** Public/queryable, hierarchical, REST API, rewrite slug, capability type, supports (title, editor, thumbnail, excerpt, author, comments, revisions, page attributes, custom fields, post formats), exclude from search, has archive

## Custom Taxonomies

Build hierarchical or flat taxonomies and attach them to multiple post types. Configure slugs, rewrite rules, REST visibility, admin column display, and tag cloud support. Taxonomy term screens support custom meta fields to add a color swatch, image, or SEO label to any term.

 
-   **Type:** Hierarchical (like categories) or flat (like tags)
    
-   **Attachment:** Attach to one or multiple post types at once
    
-   **Slugs and rewrite:** Custom permalink base, with_front toggle, REST visibility
    
-   **Term meta fields:** Add custom fields to term add/edit screens (color, image, description override, etc.)
    
-   **Admin column:** Show taxonomy terms as a column in the CPT list table
    

  

## Meta Boxes & Field Groups

With DFE Meta Boxes, you can add structured custom fields to any post type, taxonomy term, user profile, or options page. That's where you need precise control over where fields appear, reusable groups, or presentation options beyond inline post-type fields.

Field groups use location rules to target the exact screen where fields should appear. This WordPress metadata plugin has 26+ field types covering virtually every common data input. And, each field type stores predictable meta keys, which your templates and listings can read.

### 16+ FREE field types

-   **Text:** Single-line input for client name, SKU, or job title
    
-   **Textarea:** Multi-line plain text for short notes or addresses
    
-   **Number:** Numeric input with min/max for price, quantity, or rating
    
-   **Email:** Validated email for contact or support addresses
    
-   **URL:** Link field for project URLs or CTA buttons
    
-   **Date:** Date picker for event dates or deadlines
    
-   Time: Time picker for start times or office hours
    
-   **Date & Time:** Combined picker for meetings or webinar schedules
    
-   **Color:** Color picker for brand colors or term label colors
    
-   **Select:** Dropdown (single or multiple) for status or difficulty level
    
-   **Checkbox:** Multiple visible options for features, amenities, or services
    
-   **Radio:** Single choice from a list for priority, size, or gender
    
-   **Toggle:** Yes/no switch for featured items or homepage visibility
    
-   **Image:** Media picker (ID, URL, or array return) for photos or category images
    
-   **File:** File upload (ID, URL, or array return) for PDFs or resumes
    
-   **WYSIWYG:** rich text editor for detailed descriptions or styled blocks
  

### 10+ Advanced field types

-   **Group:** Nest related sub-fields together for address blocks or pricing tiers
    
-   **Repeater:** Repeat a set of sub-fields for feature lists, spec rows, or team members
    
-   **Gallery:** Select multiple images for property photos or portfolio galleries
    
-   **Relationship:** Search and attach other posts (articles to authors, products to brands)
    
-   **Taxonomy Picker:** Choose taxonomy terms for curated category picks on a post
    
-   **User Picker:** Select WordPress users to assign account managers or instructors
    
-   **Tab:** Tab headings inside large forms (General, Media, SEO sections)
    
-   **Accordion:** Collapsible field sections for cleaner long metaboxes
    
-   **Endpoint:** Close a tab or accordion section in structured layouts
    
-   **HTML:** Raw HTML block for custom notices or embedded markup
  

### Advanced field settings (Pro):

From the easy-to-use dashboard, set labels, slugs, defaults, required, placeholder, width (25–100%), character limits, min/max, REST visibility

-   **Conditional logic:** Show or hide fields based on other field values
    
-   **Pattern validation:** Custom regex with custom error messages
    
-   **Quick Edit:** Surface fields on the CPT post-list Quick Edit panel
    
-   **Revision tracking:** Include field meta when comparing post revision values
    

### Location Rules

Location rules decide where a field group (metabox) appears across your WordPress admin. Target any screen: post editor, term editor, user profile, or options page using one or more conditions that must all matches.

-   **Post screens:** post type, specific post, post status
-   **Term screens:** taxonomy, specific term
-   **User screens:** user form (Add New / Edit / Profile), user role of the user being edited
-   **Options screens:** options page menu slug
    
Each rule group uses AND logic. All conditions in the group must match for the metabox to appear. For example: show a "Project Details" field group only on the project post type with a published status, or show "SEO Settings" only on a specific options page.

The pro version of this custom field plugin adds more targeting parameters, like page template, post parent, post author, post format, post taxonomy term, current user role, current user capability. Plus OR rule groups (match any group, not just all) and metabox priority ordering.

## Options Pages

Register global admin settings pages to store site-wide data, like header settings, social links, contact info, API keys, and global defaults in the WordPress options table. You can use the same 26-type field builder as post types and meta boxes.

For a better site content structure, users can implement this setting within store header/footer content, contact details, social links, or any global configuration.

-   **Free:** one parent options page with custom icon, position, and capability control
-   **Pro:** unlimited pages, nested subpages, and per-role access controls


## Import, Export & Snapshots

Move configurations between sites with JSON export/import. The import flow validates the incoming file, shows a diff preview of exactly what will change, and lets you resolve slug conflicts before applying. Snapshots let you roll back to a previous state at any time with no complex setup.

The diff preview option is something that only DFE provides compared to other dynamic CPT plugins.  

-   **Export:** CPTs, taxonomies, field groups, and options pages as a single JSON bundle
    
-   **Import with diff preview:** See exactly what changes before anything is applied
    
-   **Conflict resolution:** Handle slug clashes on import without data loss
    
-   **Snapshot rollback:** Revert any apply with one click; snapshots are automatic
    
-   **Pro extras:** Export includes queries, listings, and relations

### AI Assistant - Build Your Content Model in No Time

The AI Assistant is the fastest way to go from a blank site to a structured content model. Describe what you are building in plain language, and DFE generates a complete schema: custom post types, taxonomies, meta fields, saved queries, listing templates, and post relations. Plus, AI-generated schemas are validated and ready to apply.

-   **Create New mode:** Start from a natural-language prompt. 'Build a real estate site with Properties, Agents, and a commission rate on each property-agent connection' produces the complete configuration in one step.
    
-   **Modify Existing mode:** Extend a post type you already built. 'Add SEO fields to my Projects CPT' appends meta title, description, and OG image without touching what exists.
    
-   **Fix Schema mode:** Paste broken or partial JSON and ask AI to repair it. Particularly useful when migrating from another plugin.
    
-   **Quick Start templates:** Five preset prompts cover Real Estate, Events, Courses, Team Members, and Job Boards. One click fills the prompt; you review before applying.
    
-   **Snapshot before every apply:** AI changes are always preceded by an automatic snapshot. Rollback to the pre-AI state with one click if the result is not what you expected.
  

## Saved Queries & Listing Templates

Build reusable query configurations for posts, terms, and users visually. Then display results with a drag-and-drop listing engine. No PHP required for property grids, team directories, course catalogs, or designed archive pages.

-   **Query Builder:** visual builder for WP_Query, WP_Term_Query, and WP_User_Query; stored and reused across listings, shortcodes, and components
    
-   **Filters:** post type, status, author, date range, include/exclude IDs, user roles
    
-   **Tax Query:** taxonomy rules with IN, NOT IN, AND, EXISTS operators
    
-   **Meta Query:** meta key comparisons (=, !=, >, LIKE, BETWEEN, EXISTS) with type casting
    
-   **Relations filter:** filter by relation pairs (IN, NOT IN, EXISTS, INHERITED IN for hierarchical content)
    
-   **Ordering:** date, title, menu order, meta value, random; posts per page and offset
    
-   **Macro tokens:** runtime context via {{current_post_id}}, {{current_user_id}}, {{url_param:key}}, {{related:<slug>:title}}, {{related_count:<slug>}}
    
-   **Live Preview:** run and validate the query inside the admin before publishing
    

**Listing Types**

-   **Card:** reusable single-item layout used inside grids
    
-   **Grid:** multi-card output from a saved query, default loop, or relation children
    
-   **Single Page:** override single-post templates for one or more post types
    
-   **Archive Page:** override archive URLs for a post type
    

**Visual Canvas Builder**

-   Drag-and-drop component palette with layers tree, live canvas preview, and component inspector
    
-   Preset gallery and Generate with AI for starter layouts
    
-   Undo/redo, duplicate, keyboard shortcuts
    

**17+ Listing Components**

Dynamic Text, Dynamic Image, Dynamic Link, Dynamic Meta, Term Badges, Repeater Output, Post Content, Breadcrumbs, Post Navigation, Comments, Author Box, Share Buttons, Related Posts, Archive Title, Archive Description, Pagination, Posts Count

-   **Source tokens** -  title, excerpt, permalink, field:<meta_key>, pair_meta:<key>, related_posts:<slug>, featured image, author, dates
    

**Embed & Display Options**

-   Shortcode:  [rdcfe_listing id="123"]
    
-   Gutenberg block: DFE Listing Grid
    
-   Elementor widget: DFE Listing Grid
    
-   **Single and archive editors:** DFE visual builder, linked Gutenberg page, or linked Elementor page
    
-   **Placement:** Full page override, replace content only, before/after content; canvas modes (full width, theme default, blank canvas)
    

**Dynamic Visibility**

Show or hide listings or individual components based on login state, user role, field value, relation existence, or taxonomy term, without writing conditional PHP.

**Pagination**

None, numeric, or load more - configurable per listing.


## Post Relations

Connect any two WordPress objects, like posts, taxonomy terms, or users, with the exact relationship type your content needs: one-to-one, one-to-many, or many-to-many. Real-world examples like Properties ↔ Agents, Courses ↔ Instructors, or Products ↔ Brands work out of the box.


Each connection can carry its own custom fields (commission rate, role, start date), and related items can be queried in saved queries and displayed using relation_children listing grids.

-   **Object kinds:** Posts, terms, or users on both source and target sides
    
-   **Cardinality:** One-to-one, one-to-many, many-to-many
    
-   **Bidirectional meta boxes:** Edit connections from either side
    
-   **Pair custom fields:** Store data on the connection itself (commission rate, role, start date)
    
-   **Limits:** Maximum items per side
    
-   **Hierarchy:** Inherit relations from parent posts, cascade to descendants
    
-   **Dedicated Storage:** wp_rdcfe_relations table for efficient queries
  

## Admin Columns & Filters

Customize the WordPress post-list table for any CPT without writing code. Add sortable meta columns, taxonomy term columns, and dropdown filters driven by actual stored values.

-   **Columns:** Sortable meta columns with prefix/suffix, taxonomy term columns, post ID column
    
-   **Filters:** Dropdown filters above the list table driven by taxonomy terms or live meta values
  

## Dynamic blocks and widgets

Standalone Gutenberg blocks and Elementor widgets for individual field output outside the listing builder. So, you can build single-page templates in Gutenberg or Elementor with per-field dynamic binding.

**Dynamic Field, Dynamic Image, Dynamic Link, Dynamic Meta, Dynamic Terms, Dynamic Repeater, Relation List, Template Render, Archive Title, Archive Description, Listing Grid block/widget.**
  

## Developer Tools

Rox is built on PHP 8.0+ with PSR-4 autoloading and a repository pattern. Register post types, taxonomies, and field groups in PHP via the registration API or drive everything over REST. Designed for theme bundling, plugin distribution, CI/CD pipelines, and test environments.

-   **PHP Registration API:** rdcfe_register_post_type(), rdcfe_add_local_field_group(), and related functions
    
-   **REST config API:** /rdcfe/v1/… endpoints with full CRUD and capability middleware
    
-   **PHP Generation:** Export any configuration as drop-in PHP code from Settings → Tools
    
-   **Filters & actions:** Hooks for registration, validation, and extension
  

## Who Is This Dynamic CPT Plugin For?

**Freelancers and agencies:** Build content models once, export as JSON, deploy to client sites. PHP Generation ships the schema inside a theme so it survives plugin deactivation.  

**WordPress developers:** PSR-4 codebase, typed interfaces, REST config API, and PHP registration API support CI/CD, version control, and plugin distribution workflows.

**Content-heavy site owners:** Create CPTs for team members, products, services, case studies, or testimonials and attach exactly the fields your editors need, no developer required day-to-day.  

**Builders replacing page-builder dependency:** Saved Queries + Listing templates give you content model and frontend output from one plugin, without requiring Elementor Pro or a separate display plugin.
 

= Links =

* [Plugin website](https://dynamicfieldsengine.com/)
* [User documentation](https://dynamicfieldsengine.com/docs)
* [Pro upgrade](https://dynamicfieldsengine.com/pricing)

== Installation ==

1. Upload the `rox-dynamic-cpt-fields-engine` folder to `/wp-content/plugins/`
2. Activate the plugin through the **Plugins** menu in WordPress
3. Open **Dynamic Fields Engine** in the admin sidebar
4. Follow the recommended setup order:
   1. Create a **Post Type**
   2. Create a **Taxonomy** and attach it to the post type
   3. Add a **Metabox** (or inline meta fields on the post type)
   4. Create an **Options Page** if you need global settings
   5. Add sample content and confirm fields save correctly

**Optional — Pro add-on**

1. Install **Dynamic Fields Engine Pro** from your vendor account
2. Activate it alongside the free plugin and enter your license key
3. Unlock Queries, Listings, Relations, AI, advanced fields, and admin columns

== Frequently Asked Questions ==

= What PHP and WordPress versions are required? =

PHP **8.0+** and WordPress **6.5+**.

= Does this replace the Block Editor for post content? =

No. DFE adds metaboxes and options screens on classic edit screens. Post content still uses the WordPress editor when you enable the `editor` support on a post type. Pro can override single/archive **templates** with designed layouts while keeping the block editor for post body content where you choose.

= Can I use this without Pro? =

Yes. The free plugin is a complete content-model builder: CPTs, taxonomies, metaboxes, one options page, 16 field types, import/export, REST API, and PHP helpers. Pro adds dynamic frontend building (queries, listings, relations) and advanced field/location options.

= Can I migrate configurations to another site? =

Yes. Use **Settings → Tools → Export** to download JSON. Import on the target site with diff preview and conflict resolution. Pro bundles can include queries, listings, and relations.

= Is there a PHP API for themes? =

Yes. Use `rdcfe_get_field( 'field_name', $post_id )`, `rdcfe_get_option()`, `rdcfe_get_term_field()`, and registration helpers in `includes/api.php`. You can also register configs in PHP without the UI via `rdcfe_register_post_type()` and related functions.

= Where are configurations stored? =

UI-built configs are stored as private `rdcfe_config` posts with JSON meta. Field values use standard WordPress meta tables (post meta, term meta, user meta, options). Pro relation pairs use the `wp_rdcfe_relations` custom table.

= Does the free plugin send data to external servers? =

No. The free plugin does not call external APIs. Pro **AI Assistant** calls OpenAI only when you enter an API key and run generation.

= What happens to Pro configs if I only have the free plugin? =

Pro configurations you build in the UI are saved. They become active when you install and license Pro — you do not need to recreate them.

= How do I display listing grids on the frontend? =

With Pro: create a Card template, then a Grid listing, then embed via shortcode `[rdcfe_listing id="YOUR_GRID_ID"]`, the **DFE Listing Grid** Gutenberg block, or the Elementor widget.

= Can I export configs as PHP for Git? =

Yes. **Settings → Tools → PHP Generation** converts selected configurations to PHP registration code for themes or companion plugins.

== Screenshots ==

1. Dashboard — overview stats and quick-create shortcuts
2. Post Type builder — labels, supports, rewrite, and inline meta fields
3. Taxonomy builder — attach to post types and add term meta fields
4. Metabox builder — field groups with location rules and presentation options
5. Options Page builder — global settings screens
6. Query Builder (Pro) — visual filters, macros, and live preview
7. Listing canvas builder (Pro) — drag-and-drop card and page templates
8. Relations editor (Pro) — connect posts, terms, and users with pair fields
9. AI Assistant (Pro) — prompt-to-schema with diff review and rollback
10. Settings and Tools — import, export, snapshots, and PHP generation

== Changelog ==

= 1.0.7 =
* Fixed Build issue

= 1.0.6 =
* Fixed localisation and pot file issue


= 1.0.5 =
* Improved localisation and pot file

= 1.0.4 =
* Added localisation 
* Added Gallery block
* Fixed bugs

= 1.0.3 =
* Expanded WordPress.org readme with full free and Pro feature documentation

= 1.0.2 =
* Maintenance release with bug fixes and builder improvements

= 1.0.0 =
* Initial release
* Free: CPTs, taxonomies, field groups, one options page, 16 core field types, basic location rules, import/export, REST API, and PHP hooks
* Pro add-on: advanced fields, queries, listings, relations, visibility, admin columns/filters, AI assistant, Gutenberg/Elementor dynamic blocks

== Upgrade Notice ==

= 1.0.3 =
Improved documentation and minor stability fixes. Safe update for all sites.

= 1.0.0 =
Initial release of Dynamic Fields Engine.

== Privacy Policy ==

Dynamic Fields Engine does not collect or transmit site data to external servers by itself.

Optional Pro features may contact third-party services only when you configure them:

* **AI Assistant** — sends prompts and site schema context to OpenAI when you provide an API key and run generation. Review OpenAI's terms and privacy policy before use.

No personal data is collected by the plugin authors through the free plugin.

== Credits ==

Developed by [wpmet](https://wpmet.com).
