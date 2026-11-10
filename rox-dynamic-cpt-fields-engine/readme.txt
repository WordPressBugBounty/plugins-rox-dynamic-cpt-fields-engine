=== Dynamic Fields Engine – Custom post types, Custom fields, Meta fields, Taxonomies, Listing builder, Query builder and Relations ===
Contributors: ataurr
Tags: custom post types, custom fields, taxonomies, meta fields, dynamic content
Requires at least: 6.5
Tested up to: 7.1
Stable tag: 1.2.1
Requires PHP: 8.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Create custom post types in WordPress with custom fields, taxonomies, and meta fields. AI-powered WordPress metadata plugin.

== Description ==

**[Dynamic Fields Engine (DFE)](https://wpmet.com/plugin/dynamic-field-engine/?utm_source=org&utm_medium=readme)** is a WordPress custom post type plugin for building custom post types, custom taxonomies, and meta fields without writing PHP. Whether you need a simple wp custom post type or a complex multi-CPT architecture, DFE handles it from one admin.

This WordPress metadata plugin lets you create custom post types, custom taxonomies, add metadata in WordPress, and manage options pages, and global settings from a clean one-stop hub. Where users can extend their content structure capabilities through saved queries, frontend listing templates, and post relationships.

https://youtu.be/z2UGwC8Ejvo?si=fBSVXcCmOiPrQnUR

DFE is an AI-powered WordPress CPT plugin. Its AI Assistant drafts and reviews every wp custom post type schema before deploying, so each configuration is validated, exportable, and protects custom post types in WordPress.

 | [Dynamic Field Engine Home Page](https://wpmet.com/plugin/dynamic-field-engine/?utm_source=org&utm_medium=readme) | [DFE Custom Post Type](https://wpmet.com/plugin/dynamic-field-engine/custom-post-types/?utm_source=org&utm_medium=readme) | [Documentation](https://wpmet.com/plugin/dynamic-field-engine/docs/?utm_source=org&utm_medium=readme) | [Need Support?](https://wpmet.com/support-ticket-form/?utm_source=org&utm_medium=readme) | [How to get started with DFE Plugin](https://wpmet.com/plugin/dynamic-field-engine/docs/getting-started/?utm_source=org&utm_medium=readme) |

https://youtu.be/-PVUbg_ol4o?si=G1sjACyk7RJ4phTa

## Key Features

  **One admin. Full content model:** Custom post types, taxonomies, field groups, and options pages from a single React interface.

  **26 field types to add and edit metadata in WordPress:** Add and edit metadata in WordPress with text, number, date, color, select, image, file, WYSIWYG, etc.

  **Import / export with rollback:** JSON portability with diff preview and snapshot rollback.

   **PHP Registration API:** Register post types, taxonomies, and field groups in PHP for theme bundling and version control.

  **REST-first config API:** Every setting backed by REST endpoints for CI/CD, headless, and programmatic management.

  **Built-in Schema validation:** Configurations validated before applying, with structured errors and automatic rollback.

  **AI Assistant:** Describe your content model in plain language and get CPTs, taxonomies, fields, queries, listings, and relations in seconds.


## Custom Post Types

Get a visual interface to create & manage [custom post types in WordPress](https://wpmet.com/plugin/dynamic-field-engine/custom-post-types/?utm_source=org&utm_medium=readme) without touching functions.php. Control labels, supports, REST visibility, archive behavior, custom post type permalinks, capability type, and menu placement. Then, attach multiple taxonomies and meta field groups directly to any wp custom post type.

https://youtu.be/ednz5Q63zfU?si=R3EVg3FkPS4dIjnu

Plus, export any wp custom post type configuration to PHP with one click from Settings → Tools → PHP Generation and drop it into a theme or plugin for version-controlled deployments. This also protects custom post types in WordPress, since the PHP-registered schema lives in your theme, so your content types survive even if the plugin is deactivated.


   **Basic settings:** Plural/singular labels, slug, description, menu icon, menu position

   **Labels tab:** Customize every WordPress admin string (Add New, Edit Item, Featured Image, Archives, and more)

   **Inline meta fields:** Attach fields directly to a post type for fast setup without a separate metabox

   **Advanced settings:** Public/queryable, hierarchical, REST API, rewrite slug, capability type, supports (title, editor, thumbnail, excerpt, author, comments, revisions, page attributes, custom fields, post formats), exclude from search, has archive

## WordPress Custom Taxonomies

[WordPress taxonomies](https://wpmet.com/plugin/dynamic-field-engine/taxonomies/?utm_source=org&utm_medium=readme) let you organize and filter content across any custom post type. DFE helps you create custom taxonomy in WordPress, both hierarchical (like categories) or flat (like tags), and attach them to one or more post types. Use a custom taxonomy template to display grouped WordPress taxonomies, or add term meta fields for richer filtering.

https://youtu.be/T420G4LxLzA?si=hgJsF0Eprq4hcu3Y

You can configure slugs, rewrite rules, REST visibility, admin column display, and tag cloud support. Taxonomy term screens support custom meta fields to add a color swatch, image, or SEO label to any term.


  **Type:** Hierarchical (like categories) or flat (like tags)

  **Attachment:** Attach to one or multiple post types at once

  **Slugs and rewrite:** Custom permalink base, with_front toggle, REST visibility

  **Term meta fields:** Add custom fields to term add/edit screens (color, image, description override, etc.)

  **Admin column:** Show taxonomy terms as a column in the CPT list table

  **Custom taxonomy template:** Use WordPress template hierarchy (taxonomy-{slug}.php) or Pro listing templates to display taxonomy archives without touching theme files


## Meta Boxes, Custom Fields & WordPress Metadata

With DFE Meta Boxes, you can add [structured custom fields](https://wpmet.com/plugin/dynamic-field-engine/custom-fields/?utm_source=org&utm_medium=readme) to any post type, taxonomy term, user profile, or options page. This is where you add metadata in WordPress with precise control over where fields appear and how they group together.

Field groups use location rules to target the exact screen to add and edit metadata in WordPress. This WordPress metadata plugin has 26+ field types and stores predictable meta keys that your templates and listings can read.

### 16+ FREE field types

Text, Textarea, Number, Email, URL, Date, Time, Date & Time, Color, Select (single & multi), Checkbox, Radio, Toggle, Image, File, WYSIWYG, all free, no Pro needed.


### 10+ Advanced field types

   **Group:** Nest related sub-fields together for address blocks or pricing tiers

   **Repeater:** Repeat a set of sub-fields for feature lists, spec rows, or team members

   **Gallery:** Select multiple images for property photos or portfolio galleries

https://youtu.be/ednz5Q63zfU?si=jq2V-UHe3EThopk0

  **Relationship:** Search and attach other posts (articles to authors, products to brands)

  **Taxonomy Picker:** Choose taxonomy terms for curated category picks on a post

  **User Picker:** Select WordPress users to assign account managers or instructors

  **Tab:** Tab headings inside large forms (General, Media, SEO sections)

  **Accordion:** Collapsible field sections for cleaner long metaboxes

  **Endpoint:** Close a tab or accordion section in structured layouts

  **HTML:** Raw HTML block for custom notices or embedded markup


### Advanced field settings (Pro):

From the easy-to-use dashboard, set labels, slugs, defaults, required, placeholder, width (25–100%), character limits, min/max, REST visibility

   **Conditional logic:** Show or hide fields based on other field values

   **Pattern validation:** Custom regex with custom error messages

   **Quick Edit:** Surface fields on the CPT post-list Quick Edit panel

   **Revision tracking:** Include field meta when comparing post revision values


### Location Rules

Location rules decide where a field group (metabox) appears across your WordPress admin. Target any screen: post editor, term editor, user profile, or options page using one or more conditions that must all matches.

  **Post screens:** post type, specific post, post status
  **Term screens:** taxonomy, specific term
  **User screens:** user form (Add New / Edit / Profile), user role of the user being edited
  **Options screens:** options page menu slug

Rule groups use AND logic. So,  all conditions must match for the metabox to appear. For example, show "Project Details" only on published posts in the project post type.

Pro adds more targeting parameters (page template, post parent, post author, post format, taxonomy term, current user role and capability), plus OR rule groups and metabox priority ordering.

## Options Pages

Register global admin settings pages alongside your custom post types to store site-wide data — header settings, social links, contact info, API keys, and global defaults — in the WordPress options table. You can use the same 26-type field builder as post types & meta boxes.

For a better site content structure, implement this setting within store header/footer content, contact details, social links, or any global configuration.


## Import, Export & Snapshots

Export and import custom post types, taxonomies, and field groups between sites with JSON. The import flow validates the incoming file, shows a diff preview of exactly what will change, and lets you resolve slug conflicts before applying. Snapshots let you roll back to a previous state at any time with no complex setup.

The diff preview option is something that only DFE provides compared to other dynamic CPT plugins.

  **Export:** CPTs, taxonomies, field groups, and options pages as a single JSON bundle

  **Import with diff preview:** See exactly what changes before anything is applied

  **Conflict resolution:** Handle slug clashes on import without data loss

  **Snapshot rollback:** Revert any apply with one click; snapshots are automatic

  **Pro extras:** Export includes queries, listings, and relations

### AI Assistant – Build Your Content Model in No Time

https://youtu.be/H5I9YSDX12c?si=rXjTNveI_tvI9vnm

The AI Assistant is the fastest way to go from a blank site to a structured content model. Describe what you are building in plain language, and DFE generates a complete schema: custom post types, taxonomies, meta fields, saved queries, listing templates, and post relations. Plus, AI-generated schemas are validated and ready to apply.

  **Create New mode:** Start from a natural-language prompt. 'Build a real estate site with Properties, Agents, and a commission rate on each property-agent connection' produces the complete configuration in one step.

  **Modify Existing mode:** Extend a post type you already built. 'Add SEO fields to my Projects CPT' appends meta title, description, and OG image without touching what exists.

  **Fix Schema mode:** Paste broken or partial JSON and ask AI to repair it. Particularly useful when migrating from another plugin.

  **Quick Start templates:** Five preset prompts cover Real Estate, Events, Courses, Team Members, and Job Boards. One click fills the prompt; you review before applying.

  **Snapshot before every apply:** AI changes are always preceded by an automatic snapshot. Rollback to the pre-AI state with one click if the result is not what you expected.


## Saved Queries & Listing Templates

Build reusable [query configurations](https://wpmet.com/plugin/dynamic-field-engine/query-builder/?utm_source=org&utm_medium=readme) for posts, terms, and users visually. Then display results with a drag-and-drop listing engine. No PHP required for property grids, team directories, course catalogs, or designed archive pages.

   **Query Builder:** visual builder for WP_Query, WP_Term_Query, and WP_User_Query; stored and reused across listings, shortcodes, and components

https://youtu.be/4Ff-tkYjJP8?si=AeAfTnOz59eeYDrX

   **Filters:** post type, status, author, date range, include/exclude IDs, user roles

   **Tax Query:** taxonomy rules with IN, NOT IN, AND, EXISTS operators

   **Meta Query:** meta key comparisons (=, !=, >, LIKE, BETWEEN, EXISTS) with type casting

   **Relations filter:** filter by relation pairs (IN, NOT IN, EXISTS, INHERITED IN for hierarchical content)

   **Ordering:** date, title, menu order, meta value, random; posts per page and offset

   **Macro tokens:** runtime context via {{current_post_id}}, {{current_user_id}}, {{url_param:key}}, {{related:<slug>:title}}, {{related_count:<slug>}}

   **Live Preview:** run and validate the query inside the admin before publishing


  **[Listing Types](https://wpmet.com/plugin/dynamic-field-engine/listing-builder/?utm_source=org&utm_medium=readme)**

https://youtu.be/dDFGBsqKjzY?si=Vg3A-EKkwwsKWdRt

  **Card:** reusable single-item layout used inside grids

  **Grid:** multi-card output from a saved query, default loop, or relation children

  **Single Page:** override single-post templates for one or more post types

  **Archive Page:** override archive URLs for a post type


**Visual Canvas Builder**

  Drag-and-drop component palette with layers tree, live canvas preview, and component inspector

  Preset gallery and Generate with AI for starter layouts

  Undo/redo, duplicate, keyboard shortcuts


**17+ Listing Components**

Dynamic Text, Dynamic Image, Dynamic Link, Dynamic Meta, Term Badges, Repeater Output, Post Content, Breadcrumbs, Post Navigation, Comments, Author Box, Share Buttons, Related Posts, Archive Title, Archive Description, Pagination, Posts Count

   **Source tokens** –  title, excerpt, permalink, field:<meta_key>, pair_meta:<key>, related_posts:<slug>, featured image, author, dates


**Embed & Display Options**

  Shortcode:  [rdcfe_listing id="123"]

  Gutenberg block: DFE Listing Grid

  Elementor widget: DFE Listing Grid

  **Single and archive editors:** DFE visual builder, linked Gutenberg page, or linked Elementor page

  **Placement:** Full page override, replace content only, before/after content; canvas modes (full width, theme default, blank canvas)


**Dynamic Visibility**

Show or hide listings or individual components based on login state, user role, field value, relation existence, or taxonomy term, without writing conditional PHP.

**Pagination**

None, numeric, or load more – configurable per listing.


## Post Relations

Connect any two WordPress objects, like posts, taxonomy terms, or users, with the exact relationship type your content needs: one-to-one, one-to-many, or many-to-many. Real-world examples like Properties ↔ Agents, Courses ↔ Instructors, or Products ↔ Brands work out of the box.


Each connection can carry its own custom fields (commission rate, role, start date), and related items can be queried in saved queries and displayed using relation_children [listing grids](https://wpmet.com/plugin/dynamic-field-engine/listing-grid/?utm_source=org&utm_medium=readme).

  **Object kinds:** Posts, terms, or users on both source and target sides

  **Cardinality:** One-to-one, one-to-many, many-to-many

  **Bidirectional meta boxes:** Edit connections from either side

   **Pair custom fields:** Store data on the connection itself (commission rate, role, start date)

   **Limits:** Maximum items per side

  **Hierarchy:** Inherit relations from parent posts, cascade to descendants

  **Dedicated Storage:** wp_rdcfe_relations table for efficient queries


## Admin Columns & Filters

Customize the WordPress post-list table for any CPT without writing code. Add sortable meta columns, taxonomy term columns, and dropdown filters driven by actual stored values.

   **Columns:** Sortable meta columns with prefix/suffix, taxonomy term columns, post ID column

   **Filters:** Dropdown filters above the list table driven by taxonomy terms or live meta values


## Dynamic blocks and widgets

Standalone Gutenberg blocks and Elementor widgets for individual field output outside the listing builder. So, you can build single-page templates in Gutenberg or Elementor with per-field dynamic binding.

**Dynamic Field, Dynamic Image, Dynamic Link, Dynamic Meta, Dynamic Terms, Dynamic Repeater, Relation List, Template Render, Archive Title, Archive Description, Listing Grid block/widget.**


## Developer Tools

Dynamic Fields Engine is a WordPress CPT plugin built on PHP 8.0+ with PSR-4 autoloading and a repository pattern. Register every wp custom post type, taxonomy, and field group in PHP via the registration API or drive everything over REST. Designed for theme bundling, plugin distribution, CI/CD, and test environments.

  **PHP Registration API:** rdcfe_register_post_type(), rdcfe_add_local_field_group(), and related functions

  **REST config API:** /rdcfe/v1/… endpoints with full CRUD and capability middleware

  **PHP Generation:** Export any configuration as drop-in PHP code from Settings → Tools

  **Filters & actions:** Hooks for registration, validation, and extension


## Who Is This Dynamic CPT Plugin For?

**Freelancers and agencies:** Build content models once, export as JSON, deploy to client sites. PHP Generation ships the schema inside a theme so it survives plugin deactivation. Whether you need a wp custom post type for a client portfolio, a job board, or a real estate directory, build it once, export as JSON, and deploy to any site.

**WordPress developers:** PSR-4 codebase, typed interfaces, REST config API, and PHP registration API support CI/CD, version control, and plugin distribution workflows.

**Content-heavy site owners:** Create CPTs and custom taxonomy in WordPress for team members, products, services, case studies, or testimonials, and attach exactly the fields your editors need to add metadata in WordPress without a developer.

**Builders replacing page-builder dependency:** Saved Queries + Listing templates give you content model and frontend output from one plugin, without requiring Elementor Pro or a separate display plugin.



== Changelog ==
= 1.2.1 =
* Fixed: Repeater data could break or disappear when a value contained quotes (") or backslashes (\). Saving now preserves the data in post types, taxonomies, metaboxes, user meta and options pages.
* Fixed: Saving a plugin's configuration with quotes or backslashes in a setting could make the whole config load empty.
* Fixed: Rich-text (WYSIWYG) fields lost their HTML formatting when saved.
* Fixed: Saving a Post Type, Taxonomy or Metabox form re-activated items that were disabled.
* Fixed: Date fields showed the previous day on sites with a non-UTC timezone.
* Fixed: The URL field rejected some valid URLs.
* Fixed: Slug length validation differed between the admin screen and the server for taxonomies and options pages.
* Fixed: Checkbox and select options were not selectable in the Query Builder.
* Fixed: Repeater "Min Rows" and "Max Rows" no longer accept negative numbers.

= 1.2.0 =
* Updated: "Upgrade to Pro" buttons now link to the correct pricing page.
* Fixed: "Upgrade to Pro" button on the Settings page was not clickable.

= 1.1.0 =
* Fixed: Field width validator was missing the 33% and 66% options.
* Fixed: Stale "Load More" pagination hint text in the Listing Grid block settings.
* Improved: "Generate with AI" suggestions now merge into existing fields by name instead of overwriting the whole list.

= 1.0.9 =
* Improved translation support across the admin interface.
* Fixed translatable admin strings so they can be correctly detected by WordPress.org translation tools.
* Localized additional labels, descriptions, and status messages in the admin UI.
* Updated the plugin translation template file.

= 1.0.8 =
* Fixed: Completed translation support across the entire admin interface, including admin menu, Pro presets, and query/listing builders
* Fixed: A location rule dropdown could disappear on non-English sites due to a mistranslated internal setting
* Security: Removed a publicly-shipped source map that exposed unminified JavaScript source

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



== Frequently Asked Questions ==

= How do I create a custom post type in WordPress? =

Install Dynamic Fields Engine, go to Post Types in the admin, click Add New, set your labels and slug, and save. Your custom post type appears in the WordPress admin menu immediately.

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

= How do I create a custom taxonomy in WordPress? =

Go to Dynamic Fields Engine → Taxonomies → Add New. Set a name, slug, and choose whether it should be hierarchical (like categories) or flat (like tags). Then attach it to one or more custom post types and save. Your WordPress custom taxonomy appears on the post editor immediately, no functions.php required.

= How do custom post type permalinks work? =

Set a custom permalink slug in the Advanced tab of the post type editor. After saving, visit WordPress Settings → Permalinks and save once to flush rewrite rules. Custom post type permalinks support custom slugs, with front toggles, and REST-friendly URL structures.

= What happens to Pro configs if I only have the free plugin? =

Pro configurations you build in the UI are saved. They become active when you install and license Pro — you do not need to recreate them.

= How do I display listing grids on the frontend? =

With Pro: create a Card template, then a Grid listing, then embed via shortcode `[rdcfe_listing id="YOUR_GRID_ID"]`, the **DFE Listing Grid** Gutenberg block, or the Elementor widget.

= Can I export configs as PHP for Git? =

Yes. **Settings → Tools → PHP Generation** converts selected configurations to PHP registration code for themes or companion plugins.

= How do I add and edit metadata in WordPress? =

Create a Field Group in Dynamic Fields Engine, choose from 26+ field types, and set location rules to attach the group to any post type, taxonomy term, user profile, or options page. Fields appear on the relevant edit screen and you can add metadata in WordPress and edit metadata in WordPress without touching code.

= How do I create a WordPress template for a custom post type? =

Free: add single-{post-type}.php and archive-{post-type}.php to your theme using WordPress template hierarchy. Pro: use DFE Single Page and Archive Page listing templates to design custom post type output visually without editing theme files.

= What is a wp custom post type and how do I create one? =

A wp custom post type is any content type you register in WordPress beyond the default Post and Page, such as Properties, Events, Courses, or Team Members. Dynamic Fields Engine lets you create a wp custom post type with custom fields, custom taxonomies, and clean custom post type permalinks straight from the admin dashboard. No functions.php edits required.

= How do I add metadata in WordPress without writing code? =

Install Dynamic Fields Engine, create a Field Group, pick from 26+ field types, and set location rules to target the screens you want. You can add metadata in WordPress to any post type, taxonomy term, user profile, or options page. To edit metadata in WordPress later, open the same Field Group, adjust the fields, and your changes apply instantly across every matching screen.



== Privacy Policy ==

Dynamic Fields Engine does not collect or transmit site data to external servers, and the plugin authors collect no personal data through the free plugin. All custom post type, taxonomy, and field data is stored in your WordPress database and follows WordPress data handling practices. For more visit our [privacy policy page.](https://wpmet.com/privacy-policy/?utm_source=org&utm_medium=readme)

The only exception is the Pro AI Assistant, which sends prompts and schema context to OpenAI, and only when you provide an API key and run generation. Nothing is sent until you add your API key and click Generate. Review OpenAI's terms and privacy policy before use.
