/**
 * RDCFE Fields - Consolidated JavaScript
 * 
 * Handles all field interactions for Metaboxes, CPT Meta Fields, and Taxonomy Meta Fields
 * 
 * @package RoxDynamicCPTFieldsEngine
 */

(function($) {
	'use strict';

	/**
	 * DCFE Fields Manager
	 */
	var RDCFEFields = {

		// Localization strings (set via wp_localize_script)
		l10n: window.rdcfeFieldsL10n || {
			selectImage: 'Select Image',
			selectImages: 'Select Images',
			useImage: 'Use this image',
			useImages: 'Use these images',
			selectFile: 'Select File',
			useFile: 'Use this file',
			remove: 'Remove',
			required: 'This field is required.',
			invalidUrl: 'Please enter a valid URL.',
			invalidEmail: 'Please enter a valid email address.',
			validationError: 'Validation Error:',
			validationMessage: 'Please fill in all required fields and correct any validation errors before saving.',
			dismiss: 'Dismiss this notice.'
		},

		// Validation patterns
		patterns: {
			email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
			url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i
		},

		// Validation lock name for Gutenberg
		validationLockName: 'dcfeFieldValidation',
		validationLocked: false,

		/**
		 * Initialize all field types
		 */
		init: function() {
			var self = this;

			this.initDatePickers();
			this.initColorPickers();
			this.initMediaFields();
			this.initSelect2();
			this.initTabs();
			this.initAccordions();
			this.initValidation();
			// Sub-field media handlers (file inside Group/Repeater).
			// Image inside Group/Repeater is already covered by the
			// universal `.dcfeImage*` handlers in `initMediaFields()`.
			this.initSubfieldMediaFields();
			// Group, Repeater and Gallery are Pro-only fields. Their
			// handlers live in
			// rox-dynamic-cpt-fields-engine-pro/assets/js/rdcfe-pro-fields.js.
			// Duplicate handlers used to live here too, which caused
			// double row inserts on "Add Row" and — more importantly —
			// the Pro handler that fired second appended a new row
			// without re-initialising Date / Color / Media pickers,
			// so those sub-fields stayed plain text inputs. The Pro
			// plugin is the single source of truth for these field
			// types now and calls back into `window.RDCFEFields` to
			// re-init pickers after adding/duplicating rows.

			// Re-initialize on Gutenberg panel toggle
			$(document).on('click', '.components-panel__body-toggle', function() {
				setTimeout(function() {
					self.initDatePickers();
					self.initColorPickers();
				}, 100);
			});
		},

		/**
		 * Initialize jQuery UI Datepickers
		 * Reads data attributes: data-date-format, data-min-date, data-max-date
		 */
		initDatePickers: function() {
			$('.rdcfe-datepicker, .rdcfe-taxonomy-datepicker, .rdcfe-input--date').each(function() {
				var $input = $(this);

				// Skip if already initialized
				if ($input.hasClass('hasDatepicker')) {
					return;
				}

				// Read options from data attributes
				var options = {
					dateFormat: $input.data('date-format') || 'yy-mm-dd',
					changeMonth: true,
					changeYear: true,
					yearRange: '-100:+10',
					showButtonPanel: true,
					beforeShow: function(input, inst) {
						inst.dpDiv.addClass('rdcfe-datepicker-popup rdcfe-taxonomy-datepicker-popup');
					}
				};

				// Optional min/max dates
				var minDate = $input.data('min-date');
				var maxDate = $input.data('max-date');

				if (minDate) {
					options.minDate = minDate;
				}
				if (maxDate) {
					options.maxDate = maxDate;
				}

				$input.datepicker(options);
			});
		},

		/**
		 * Initialize WordPress Color Pickers
		 * Reads data attributes: data-default-color
		 */
		initColorPickers: function() {
			$('.rdcfe-color-field, .rdcfe-taxonomy-color-field').each(function() {
				var $input = $(this);

				// Skip if already initialized
				if ($input.closest('.wp-picker-container').length) {
					return;
				}

				var defaultColor = $input.data('default-color') || '';

				$input.wpColorPicker({
					defaultColor: defaultColor,
					change: function(event, ui) {
						$(this).val(ui.color.toString()).trigger('change');
					},
					clear: function() {
						$(this).val('').trigger('change');
					}
				});
			});
		},

		/**
		 * Initialize Select2 for multiple selects
		 */
		initSelect2: function() {
			if (typeof $.fn.select2 === 'undefined') {
				return;
			}

			$('.rdcfe-select--multiple, .rdcfe-taxonomy-select--multiple').each(function() {
				var $select = $(this);

				// Skip if already initialized
				if ($select.hasClass('select2-hidden-accessible')) {
					return;
				}

				$select.select2({
					placeholder: $select.data('placeholder') || 'Select options...',
					allowClear: true,
					width: '100%'
				});
			});
		},

		/**
		 * Initialize Media Library Fields (Image/File)
		 * NOTE: This handler does NOT apply to fields inside Group/Repeater.
		 * Sub-fields inside Group/Repeater are handled by initSubfieldMediaFields()
		 */
		initMediaFields: function() {
			var self = this;

			// Image field — Select.
			// Single delegated handler that covers both top-level and
			// sub-field (Group/Repeater) Image fields, in both single
			// and multiple modes. Mode is read from `data-multiple` on
			// the field wrapper.
			$(document).off('click.dcfeImage').on('click.dcfeImage', '.rdcfe-image-field__select, .rdcfe-taxonomy-image-field__select', function(e) {
				e.preventDefault();
				e.stopImmediatePropagation();

				var $field = $(this).closest('.rdcfe-image-field, .rdcfe-taxonomy-image-field');
				self.openImagePicker($field);
				return false;
			});

			// Image field — Remove (clear All in multi mode, single image in single mode).
			$(document).off('click.dcfeImageRemove').on('click.dcfeImageRemove', '.rdcfe-image-field__remove, .rdcfe-taxonomy-image-field__remove', function(e) {
				e.preventDefault();
				var $field = $(this).closest('.rdcfe-image-field, .rdcfe-taxonomy-image-field');
				self.clearImageField($field);
			});

			// Image field — Remove a single thumbnail (multi mode only).
			$(document).off('click.dcfeImageItemRemove').on('click.dcfeImageItemRemove', '.rdcfe-image-field__item-remove', function(e) {
				e.preventDefault();
				e.stopPropagation();
				var $item = $(this).closest('.rdcfe-image-field__item');
				var $field = $item.closest('.rdcfe-image-field, .rdcfe-taxonomy-image-field');
				$item.remove();
				self.syncImageFieldValue($field);
			});

			// File field - Select (exclude Group/Repeater sub-fields)
			$(document).off('click.dcfeFile').on('click.dcfeFile', '.rdcfe-file-field__select, .rdcfe-taxonomy-file-field__select', function(e) {
				// Skip if inside Group or Repeater - handled separately
				if ($(this).closest('.rdcfe-group-field, .rdcfe-repeater-field').length) {
					return;
				}
				
				e.preventDefault();
				e.stopImmediatePropagation();

				var $button = $(this);
				var $field = $button.closest('.rdcfe-file-field, .rdcfe-taxonomy-file-field');
				var $input = $field.find('input[type="hidden"]');
				var $info = $field.find('.rdcfe-file-field__info, .rdcfe-taxonomy-file-field__info');
				var $removeBtn = $field.find('.rdcfe-file-field__remove, .rdcfe-taxonomy-file-field__remove');

				var frame = new wp.media.view.MediaFrame.Select({
					title: self.l10n.selectFile,
					button: {
						text: self.l10n.useFile
					},
					multiple: false
				});

				frame.on('select', function() {
					var attachment = frame.state().get('selection').first().toJSON();

					$input.val(attachment.id);
					$input[0].dispatchEvent(new Event('change', { bubbles: true }));
					$info.html('<a href="' + attachment.url + '" target="_blank">' + attachment.filename + '</a>').show();
					$removeBtn.show();
				});

				frame.open();
				return false;
			});

			// File field - Remove (exclude Group/Repeater sub-fields)
			$(document).off('click.dcfeFileRemove').on('click.dcfeFileRemove', '.rdcfe-file-field__remove, .rdcfe-taxonomy-file-field__remove', function(e) {
				// Skip if inside Group or Repeater - handled separately
				if ($(this).closest('.rdcfe-group-field, .rdcfe-repeater-field').length) {
					return;
				}
				
				e.preventDefault();

				var $button = $(this);
				var $field = $button.closest('.rdcfe-file-field, .rdcfe-taxonomy-file-field');
				var $input = $field.find('input[type="hidden"]');
				var $info = $field.find('.rdcfe-file-field__info, .rdcfe-taxonomy-file-field__info');

				$input.val('');
				$input[0].dispatchEvent(new Event('change', { bubbles: true }));
				$info.html('').hide();
				$button.hide();
			});
		},

		/**
		 * Open the WP Media picker for an image field. Honours the
		 * field's `data-multiple` attribute: in multi mode the picker
		 * allows multi-select and pre-selects the field's existing
		 * attachments so the user can deselect inside the library.
		 *
		 * @param {jQuery} $field The `.rdcfe-image-field` element.
		 */
		openImagePicker: function($field) {
			var self = this;

			if (typeof wp === 'undefined' || !wp.media) {
				return;
			}

			// Re-entrancy guard. Prevents a second picker from opening if
			// a previous click is still in flight (e.g. handler bound
			// twice across init cycles, or some upstream hook also fires
			// `wp.media`). The flag clears on `close` so subsequent
			// opens still work normally.
			if ($field.data('rdcfe-picker-open')) {
				return;
			}
			$field.data('rdcfe-picker-open', true);

			var multiple = $field.attr('data-multiple') === 'true';
			var title = multiple
				? (self.l10n.selectImages || 'Select Images')
				: (self.l10n.selectImage || 'Select Image');
			var btnText = multiple
				? (self.l10n.useImages || self.l10n.useImage || 'Use these images')
				: (self.l10n.useImage || 'Use this image');

			var frame = wp.media({
				title: title,
				button: { text: btnText },
				library: { type: 'image' },
				multiple: multiple
			});

			frame.on('close', function() {
				$field.data('rdcfe-picker-open', false);
			});

			// In multi mode, hydrate the library with the IDs already on
			// the field so users see what's already saved.
			if (multiple) {
				frame.on('open', function() {
					var selection = frame.state().get('selection');
					if (!selection) {
						return;
					}
					self.getImageFieldIds($field).forEach(function(id) {
						var attachment = wp.media.attachment(id);
						if (attachment) {
							attachment.fetch();
							selection.add([ attachment ]);
						}
					});
				});
			}

			frame.on('select', function() {
				var selection = frame.state().get('selection');
				if (!selection) {
					return;
				}

				if (multiple) {
					var ids = [];
					selection.each(function(attachment) {
						ids.push(attachment.id);
					});
					self.renderImagePreview($field, ids);
				} else {
					var attachment = selection.first();
					if (attachment) {
						self.renderImagePreview($field, [ attachment.id ]);
					}
				}
			});

			frame.open();
		},

		/**
		 * Read the current attachment IDs from an image field's hidden
		 * input. Works for both single and multi modes (CSV-aware).
		 *
		 * @param {jQuery} $field The `.rdcfe-image-field` element.
		 * @return {number[]}
		 */
		getImageFieldIds: function($field) {
			var raw = ($field.find('input[type="hidden"]').first().val() || '').toString();
			if (!raw) {
				return [];
			}
			return raw.split(',')
				.map(function(part) { return parseInt(part.trim(), 10); })
				.filter(function(id) { return !isNaN(id) && id > 0; });
		},

		/**
		 * Update an image field's hidden input + Remove button visibility
		 * from the DOM thumbnails currently displayed. Used after the
		 * picker confirms a selection or after a thumbnail is removed.
		 *
		 * @param {jQuery} $field The `.rdcfe-image-field` element.
		 */
		syncImageFieldValue: function($field) {
			var ids = [];
			var $items = $field.find('.rdcfe-image-field__item');

			if ($items.length) {
				$items.each(function() {
					var id = parseInt($(this).attr('data-id'), 10);
					if (!isNaN(id) && id > 0) {
						ids.push(id);
					}
				});
			} else {
				// Single mode keeps a single <img>, so the input itself
				// is the source of truth — leave it untouched, but use
				// it to drive the Remove button visibility below.
				ids = this.getImageFieldIds($field);
			}

			var $input = $field.find('input[type="hidden"]').first();
			var $preview = $field.find('.rdcfe-image-field__preview').first();
			var $removeBtn = $field.find('.rdcfe-image-field__remove').first();

			if ($items.length) {
				$input.val(ids.join(','));
			}

			if ($input[0]) {
				$input[0].dispatchEvent(new Event('change', { bubbles: true }));
			}

			if (ids.length === 0) {
				$preview.hide();
				$removeBtn.hide();
			} else {
				$preview.show();
				$removeBtn.show();
			}
		},

		/**
		 * Render the preview area of an image field for the given list
		 * of attachment IDs. In single mode renders one `<img>`. In
		 * multi mode renders a `<ul class="rdcfe-image-field__list">`
		 * with one `<li class="rdcfe-image-field__item">` per ID.
		 *
		 * @param {jQuery} $field The `.rdcfe-image-field` element.
		 * @param {number[]} ids  Attachment IDs to render.
		 */
		renderImagePreview: function($field, ids) {
			var self = this;
			var multiple = $field.attr('data-multiple') === 'true';
			var $input = $field.find('input[type="hidden"]').first();
			var $preview = $field.find('.rdcfe-image-field__preview').first();
			var $removeBtn = $field.find('.rdcfe-image-field__remove').first();

			ids = (ids || []).filter(function(id) { return !!id; });

			if (multiple) {
				var $list = $('<ul class="rdcfe-image-field__list"></ul>');
				ids.forEach(function(id) {
					var url = self.resolveAttachmentThumbUrl(id);
					if (!url) {
						return;
					}
					$list.append(
						'<li class="rdcfe-image-field__item" data-id="' + id + '">'
						+ '<img src="' + url + '" alt="" />'
						+ '<button type="button" class="rdcfe-image-field__item-remove" title="' + (self.l10n.remove || 'Remove') + '">'
						+ '<span class="dashicons dashicons-no-alt"></span>'
						+ '</button>'
						+ '</li>'
					);
				});
				$preview.html($list);
				$input.val(ids.join(','));
			} else {
				var firstId = ids[0] || 0;
				var url = firstId ? self.resolveAttachmentThumbUrl(firstId) : '';
				if (firstId && url) {
					$preview.html('<img src="' + url + '" alt="" />');
					$input.val(firstId);
				} else {
					$preview.html('');
					$input.val('');
				}
			}

			if ($input[0]) {
				$input[0].dispatchEvent(new Event('change', { bubbles: true }));
			}

			if (ids.length === 0) {
				$preview.hide();
				$removeBtn.hide();
			} else {
				$preview.show();
				$removeBtn.show();
			}
		},

		/**
		 * Resolve a thumbnail URL for an attachment ID via the cached
		 * wp.media.attachment store. Returns '' if no URL is known yet
		 * (the attachment may need a `.fetch()` round-trip first).
		 */
		resolveAttachmentThumbUrl: function(id) {
			if (typeof wp === 'undefined' || !wp.media) {
				return '';
			}
			var attachment = wp.media.attachment(id);
			if (!attachment) {
				return '';
			}
			var data = attachment.toJSON();
			if (data.sizes && data.sizes.thumbnail && data.sizes.thumbnail.url) {
				return data.sizes.thumbnail.url;
			}
			return data.url || '';
		},

		/**
		 * Clear an image field. In single mode resets to empty value; in
		 * multi mode removes all thumbnails.
		 *
		 * @param {jQuery} $field The `.rdcfe-image-field` element.
		 */
		clearImageField: function($field) {
			this.renderImagePreview($field, []);
		},

		/**
		 * Initialize Tabs functionality
		 */
		initTabs: function() {
			// CPT Tabs
			$('.rdcfe-tabs').each(function() {
				var $container = $(this);
				var $tabs = $container.find('.rdcfe-tabs__tab');
				var $panels = $container.find('.rdcfe-tabs__panel');

				$tabs.off('click.dcfeTabs').on('click.dcfeTabs', function(e) {
					e.preventDefault();
					var tabIndex = parseInt($(this).data('tab-index'), 10);

					$tabs.each(function(i) {
						if (i === tabIndex) {
							$(this).addClass('rdcfe-tabs__tab--active').attr('aria-selected', 'true');
						} else {
							$(this).removeClass('rdcfe-tabs__tab--active').attr('aria-selected', 'false');
						}
					});

					$panels.each(function(i) {
						if (i === tabIndex) {
							$(this).addClass('rdcfe-tabs__panel--active').removeAttr('hidden');
						} else {
							$(this).removeClass('rdcfe-tabs__panel--active').attr('hidden', 'hidden');
						}
					});
				});
			});

			// Taxonomy Tabs
			$('.rdcfe-taxonomy-tabs').each(function() {
				var $container = $(this);
				var $tabs = $container.find('.rdcfe-taxonomy-tabs__tab');
				var $panels = $container.find('.rdcfe-taxonomy-tabs__panel');

				$tabs.off('click.dcfeTaxTabs').on('click.dcfeTaxTabs', function(e) {
					e.preventDefault();
					var tabIndex = parseInt($(this).data('tab-index'), 10);

					$tabs.each(function(i) {
						if (i === tabIndex) {
							$(this).addClass('rdcfe-taxonomy-tabs__tab--active').attr('aria-selected', 'true');
						} else {
							$(this).removeClass('rdcfe-taxonomy-tabs__tab--active').attr('aria-selected', 'false');
						}
					});

					$panels.each(function(i) {
						if (i === tabIndex) {
							$(this).addClass('rdcfe-taxonomy-tabs__panel--active').removeAttr('hidden');
						} else {
							$(this).removeClass('rdcfe-taxonomy-tabs__panel--active').attr('hidden', 'hidden');
						}
					});
				});
			});
		},

		/**
		 * Initialize Accordions functionality
		 */
		initAccordions: function() {
			// CPT Accordions
			$('.rdcfe-accordions').each(function() {
				var $container = $(this);
				var $headers = $container.find('.rdcfe-accordion__header');

				$headers.off('click.dcfeAccordion').on('click.dcfeAccordion', function(e) {
					e.preventDefault();
					var $accordion = $(this).closest('.rdcfe-accordion');
					var $content = $accordion.find('.rdcfe-accordion__content');
					var isOpen = $accordion.hasClass('rdcfe-accordion--open');

					if (isOpen) {
						$accordion.removeClass('rdcfe-accordion--open');
						$content.attr('hidden', 'hidden');
						$(this).attr('aria-expanded', 'false');
					} else {
						$accordion.addClass('rdcfe-accordion--open');
						$content.removeAttr('hidden');
						$(this).attr('aria-expanded', 'true');
					}
				});
			});

			// Taxonomy Accordions
			$('.rdcfe-taxonomy-accordions').each(function() {
				var $container = $(this);
				var $headers = $container.find('.rdcfe-taxonomy-accordion__header');

				$headers.off('click.dcfeTaxAccordion').on('click.dcfeTaxAccordion', function(e) {
					e.preventDefault();
					var $accordion = $(this).closest('.rdcfe-taxonomy-accordion');
					var $content = $accordion.find('.rdcfe-taxonomy-accordion__content');
					var isOpen = $accordion.hasClass('rdcfe-taxonomy-accordion--open');

					if (isOpen) {
						$accordion.removeClass('rdcfe-taxonomy-accordion--open');
						$content.attr('hidden', 'hidden');
						$(this).attr('aria-expanded', 'false');
					} else {
						$accordion.addClass('rdcfe-taxonomy-accordion--open');
						$content.removeAttr('hidden');
						$(this).attr('aria-expanded', 'true');
					}
				});
			});
		},

		/**
		 * Initialize Field Validation
		 */
		initValidation: function() {
			var self = this;

			// Real-time validation on blur
			$(document).on('blur', '.rdcfe-field[data-required="true"] input, .rdcfe-field[data-required="true"] textarea, .rdcfe-field[data-required="true"] select', function() {
				self.validateField($(this).closest('.rdcfe-field'));
			});

			$(document).on('blur', '.rdcfe-taxonomy-field[data-required="true"] input, .rdcfe-taxonomy-field[data-required="true"] textarea, .rdcfe-taxonomy-field[data-required="true"] select', function() {
				self.validateTaxonomyField($(this).closest('.rdcfe-taxonomy-field'));
			});

			// Clear error on input
			$(document).on('input change', '.rdcfe-field--error input, .rdcfe-field--error textarea, .rdcfe-field--error select', function() {
				self.clearFieldError($(this).closest('.rdcfe-field'));
			});

			$(document).on('input change', '.rdcfe-taxonomy-field--error input, .rdcfe-taxonomy-field--error textarea, .rdcfe-taxonomy-field--error select', function() {
				self.clearTaxonomyFieldError($(this).closest('.rdcfe-taxonomy-field'));
			});

			// Classic Editor validation
			this.initClassicEditorValidation();

			// Gutenberg validation
			this.initGutenbergValidation();

			// Taxonomy form validation
			this.initTaxonomyFormValidation();

			// Keyboard shortcut validation (Ctrl/Cmd + S)
			$(document).on('keydown', function(e) {
				if ((e.ctrlKey || e.metaKey) && e.key === 's') {
					if (!self.validateAllFields()) {
						e.preventDefault();
						e.stopImmediatePropagation();
						self.showValidationNotice();
						return false;
					}
				}
			});
		},

		/**
		 * Initialize Classic Editor validation
		 */
		initClassicEditorValidation: function() {
			var self = this;
			var $postForm = $('#post');

			if (!$postForm.length) {
				return;
			}

			// Intercept publish/update buttons
			$('#publish, #save-post, input[name="save"]').on('click', function(e) {
				if (!self.validateAllFields()) {
					e.preventDefault();
					e.stopImmediatePropagation();
					self.showValidationNotice();
					return false;
				}
			});

			// Form submit validation
			$postForm.on('submit', function(e) {
				if (!self.validateAllFields()) {
					e.preventDefault();
					e.stopImmediatePropagation();
					self.showValidationNotice();
					return false;
				}
			});
		},

		/**
		 * Initialize Gutenberg validation
		 */
		initGutenbergValidation: function() {
			var self = this;

			if (typeof wp === 'undefined' || !wp.data || !wp.data.subscribe) {
				return;
			}

			var wasSaving = false;

			// Subscribe to editor state changes
			wp.data.subscribe(function() {
				var editor = wp.data.select('core/editor');
				if (!editor) return;

				var isSaving = editor.isSavingPost();
				var isAutosaving = editor.isAutosavingPost();

				// Skip autosaves
				if (isAutosaving) return;

				// Detect when save starts
				if (isSaving && !wasSaving) {
					if (!self.validateAllFields()) {
						if (!self.validationLocked) {
							wp.data.dispatch('core/editor').lockPostSaving(self.validationLockName);
							self.validationLocked = true;
							self.showGutenbergNotice();
						}
					}
				}

				wasSaving = isSaving;
			});

			// Observe for Gutenberg buttons
			this.observeGutenbergButtons();
		},

		/**
		 * Observe Gutenberg buttons for validation
		 */
		observeGutenbergButtons: function() {
			var self = this;

			var observer = new MutationObserver(function() {
				var buttons = document.querySelectorAll(
					'.editor-post-publish-button, ' +
					'.editor-post-save-draft, ' +
					'.editor-post-publish-panel__toggle, ' +
					'button.is-primary[aria-disabled="false"]'
				);

				buttons.forEach(function(btn) {
					if (btn.dataset.dcfeValidationBound) return;
					btn.dataset.dcfeValidationBound = 'true';

					btn.addEventListener('click', function(e) {
						if (!self.validateAllFields()) {
							e.preventDefault();
							e.stopImmediatePropagation();

							if (wp.data && wp.data.dispatch) {
								wp.data.dispatch('core/editor').lockPostSaving(self.validationLockName);
								self.validationLocked = true;
							}

							self.showGutenbergNotice();
							return false;
						} else {
							// Unlock if validation passes
							if (self.validationLocked && wp.data && wp.data.dispatch) {
								wp.data.dispatch('core/editor').unlockPostSaving(self.validationLockName);
								self.validationLocked = false;
							}
						}
					}, true);
				});
			});

			// Start observing
			var editorContainer = document.querySelector('.block-editor, .edit-post-layout, #editor');
			if (editorContainer) {
				observer.observe(editorContainer, { childList: true, subtree: true });
			} else {
				observer.observe(document.body, { childList: true, subtree: true });
			}
		},

		/**
		 * Initialize Taxonomy form validation
		 */
		initTaxonomyFormValidation: function() {
			var self = this;

			// Add term form
			$('#addtag').on('submit', function(e) {
				if (!self.validateAllTaxonomyFields()) {
					e.preventDefault();
					self.showValidationNotice();
					return false;
				}
			});

			// Edit term form
			$('#edittag').on('submit', function(e) {
				if (!self.validateAllTaxonomyFields()) {
					e.preventDefault();
					self.showValidationNotice();
					return false;
				}
			});
		},

		/**
		 * Get field input element
		 */
		getFieldInput: function($field) {
			var fieldName = $field.data('field-name');
			if (!fieldName) return null;

			var $input = $field.find('[name="' + fieldName + '"]');
			if (!$input.length) {
				$input = $field.find('[name="' + fieldName + '[]"]');
			}
			return $input.length ? $input : null;
		},

		/**
		 * Get field value
		 */
		getFieldValue: function($field) {
			var $input = this.getFieldInput($field);
			if (!$input || !$input.length) return '';

			var inputType = $input.attr('type') || '';
			var tagName = ($input.prop('tagName') || '').toLowerCase();

			// Handle checkboxes
			if (inputType === 'checkbox') {
				var $checked = $field.find('input[type="checkbox"]:checked');
				return $checked.length > 0 ? 'checked' : '';
			}

			// Handle radio buttons
			if (inputType === 'radio') {
				var $checked = $field.find('input[type="radio"]:checked');
				return $checked.length ? $checked.val() : '';
			}

			// Handle select (including multi-select)
			if (tagName === 'select') {
				var val = $input.val();
				if (Array.isArray(val)) {
					// Multi-select: return joined string or empty if no selection
					return val.length > 0 ? val.join(',') : '';
				}
				return val ? String(val).trim() : '';
			}

			// Handle WYSIWYG/TinyMCE editors
			if (tagName === 'textarea') {
				var editorId = $input.attr('id');
				if (editorId && typeof tinymce !== 'undefined' && tinymce.get(editorId)) {
					var editor = tinymce.get(editorId);
					var content = editor.getContent({format: 'text'}).trim();
					return content;
				}
			}

			// Handle regular inputs and textareas
			var val = $input.val();
			if (val === null || val === undefined) {
				return '';
			}
			return String(val).trim();
		},

		/**
		 * Validate a single CPT field
		 */
		validateField: function($field) {
			var isRequired = $field.data('required') === true || $field.data('required') === 'true';
			var validateUrl = $field.data('validate-url') === true || $field.data('validate-url') === 'true';
			var validateEmail = $field.data('validate-email') === true || $field.data('validate-email') === 'true';
			var value = this.getFieldValue($field);
			var fieldLabel = $field.data('field-label') || 'This field';

			// Clear previous error
			this.clearFieldError($field);

			// Required validation
			if (isRequired && !value) {
				this.showFieldError($field, fieldLabel + ' ' + this.l10n.required.replace('This field', '').trim());
				return false;
			}

			// URL validation
			if (validateUrl && value && !this.patterns.url.test(value)) {
				this.showFieldError($field, this.l10n.invalidUrl);
				return false;
			}

			// Email validation
			if (validateEmail && value && !this.patterns.email.test(value)) {
				this.showFieldError($field, this.l10n.invalidEmail);
				return false;
			}

			return true;
		},

		/**
		 * Validate a single Taxonomy field
		 */
		validateTaxonomyField: function($field) {
			var isRequired = $field.find('.rdcfe-taxonomy-required').length > 0;
			var value = '';

			var $input = $field.find('input, textarea, select').first();
			if ($input.length) {
				value = $input.val() ? String($input.val()).trim() : '';
			}

			// Clear previous error
			this.clearTaxonomyFieldError($field);

			// Required validation
			if (isRequired && !value) {
				this.showTaxonomyFieldError($field, this.l10n.required);
				return false;
			}

			return true;
		},

		/**
		 * Show field error
		 */
		showFieldError: function($field, message) {
			$field.addClass('rdcfe-field--error');
			var $error = $field.find('.rdcfe-field__error');
			if ($error.length) {
				$error.text(message).show();
			}

			var $input = this.getFieldInput($field);
			if ($input) {
				$input.addClass('rdcfe-input--error');
			}
		},

		/**
		 * Clear field error
		 */
		clearFieldError: function($field) {
			$field.removeClass('rdcfe-field--error');
			$field.find('.rdcfe-field__error').text('').hide();

			var $input = this.getFieldInput($field);
			if ($input) {
				$input.removeClass('rdcfe-input--error');
			}
		},

		/**
		 * Show taxonomy field error
		 */
		showTaxonomyFieldError: function($field, message) {
			$field.addClass('rdcfe-taxonomy-field--error');
			var $error = $field.find('.rdcfe-taxonomy-field__error');
			if (!$error.length) {
				$error = $('<div class="rdcfe-taxonomy-field__error"></div>');
				$field.find('.rdcfe-taxonomy-field__input').append($error);
			}
			$error.text(message).show();
		},

		/**
		 * Clear taxonomy field error
		 */
		clearTaxonomyFieldError: function($field) {
			$field.removeClass('rdcfe-taxonomy-field--error');
			$field.find('.rdcfe-taxonomy-field__error').text('').hide();
		},

		/**
		 * Validate all CPT fields
		 */
		validateAllFields: function() {
			var self = this;
			var isValid = true;
			var $firstInvalid = null;

			$('.rdcfe-field[data-required="true"], .rdcfe-field[data-validate-url="true"], .rdcfe-field[data-validate-email="true"]').each(function() {
				if (!self.validateField($(this))) {
					isValid = false;
					if (!$firstInvalid) {
						$firstInvalid = $(this);
					}
				}
			});

			// Scroll to first invalid field
			if ($firstInvalid) {
				this.scrollToField($firstInvalid);
			}

			return isValid;
		},

		/**
		 * Validate all Taxonomy fields
		 */
		validateAllTaxonomyFields: function() {
			var self = this;
			var isValid = true;
			var $firstInvalid = null;

			$('.rdcfe-taxonomy-field').each(function() {
				var $field = $(this);
				var hasRequired = $field.find('.rdcfe-taxonomy-required').length > 0;

				if (hasRequired && !self.validateTaxonomyField($field)) {
					isValid = false;
					if (!$firstInvalid) {
						$firstInvalid = $field;
					}
				}
			});

			// Scroll to first invalid field
			if ($firstInvalid) {
				$('html, body').animate({
					scrollTop: $firstInvalid.offset().top - 100
				}, 300);
			}

			return isValid;
		},

		/**
		 * Scroll to invalid field, opening tab/accordion if needed
		 */
		scrollToField: function($field) {
			// Check if field is in a hidden tab
			var $hiddenTab = $field.closest('.rdcfe-tabs__panel[hidden], .rdcfe-taxonomy-tabs__panel[hidden]');
			if ($hiddenTab.length) {
				var tabId = $hiddenTab.attr('aria-labelledby');
				if (tabId) {
					$('#' + tabId).trigger('click');
				}
			}

			// Check if field is in a hidden accordion
			var $hiddenAccordion = $field.closest('.rdcfe-accordion__content[hidden], .rdcfe-taxonomy-accordion__content[hidden]');
			if ($hiddenAccordion.length) {
				var $header = $hiddenAccordion.prev('.rdcfe-accordion__header, .rdcfe-taxonomy-accordion__header');
				if ($header.length) {
					$header.trigger('click');
				}
			}

			// Scroll after a short delay to allow tab/accordion animation
			setTimeout(function() {
				$('html, body').animate({
					scrollTop: $field.offset().top - 100
				}, 300);

				// Focus input
				var $input = $field.find('input, textarea, select').first();
				if ($input.length && $input.focus) {
					$input.focus();
				}
			}, 150);
		},

		/**
		 * Show validation notice (Classic Editor)
		 */
		showValidationNotice: function() {
			// Remove existing notice
			$('.rdcfe-validation-notice').remove();

			var notice = '<div class="notice notice-error is-dismissible rdcfe-validation-notice">' +
				'<p><strong>' + this.l10n.validationError + '</strong> ' + this.l10n.validationMessage + '</p>' +
				'<button type="button" class="notice-dismiss"><span class="screen-reader-text">' + this.l10n.dismiss + '</span></button>' +
				'</div>';

			// Insert after heading
			var $heading = $('.wrap h1, .interface-interface-skeleton__header').first();
			if ($heading.length) {
				$(notice).insertAfter($heading);
			} else {
				$('#wpbody-content .wrap, .block-editor').first().prepend(notice);
			}

			// Dismiss functionality
			$('.rdcfe-validation-notice .notice-dismiss').on('click', function() {
				$(this).closest('.notice').remove();
			});

			// Scroll to top
			$('html, body').animate({ scrollTop: 0 }, 300);
		},

		/**
		 * Show Gutenberg validation notice
		 */
		showGutenbergNotice: function() {
			if (typeof wp !== 'undefined' && wp.data && wp.data.dispatch) {
				wp.data.dispatch('core/notices').createErrorNotice(
					this.l10n.validationMessage,
					{
						id: 'rdcfe-validation-error',
						isDismissible: true,
						type: 'snackbar'
					}
				);
			}
		},

		/**
		 * Unlock Gutenberg saving (when all fields are valid)
		 */
		unlockGutenbergSaving: function() {
			if (this.validationLocked && typeof wp !== 'undefined' && wp.data && wp.data.dispatch) {
				wp.data.dispatch('core/editor').unlockPostSaving(this.validationLockName);
				this.validationLocked = false;

				// Remove notice
				if (wp.data.dispatch('core/notices')) {
					wp.data.dispatch('core/notices').removeNotice('rdcfe-validation-error');
				}
			}
		},

		/**
		 * Initialize Media Fields inside Group/Repeater sub-fields (Pro)
		 * Separate handler to avoid conflicts with main media fields
		 */
		initSubfieldMediaFields: function() {
			var self = this;

			// Image field inside Group/Repeater — handled by the
			// top-level `.dcfeImage` / `.dcfeImageRemove` /
			// `.dcfeImageItemRemove` delegated handlers in
			// `initMediaFields()` so single-mode and multi-mode logic
			// lives in one place.

			// File field inside Group/Repeater - Select
			$(document).off('click.dcfeSubfieldFile').on('click.dcfeSubfieldFile', '.rdcfe-group-field .rdcfe-file-field__select, .rdcfe-repeater-field .rdcfe-file-field__select', function(e) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();

				var $button = $(this);
				var $field = $button.closest('.rdcfe-file-field');
				var $input = $field.find('input[type="hidden"]').first();
				var $info = $field.find('.rdcfe-file-field__info').first();
				var $removeBtn = $field.find('.rdcfe-file-field__remove').first();

				var frame = wp.media({
					title: self.l10n.selectFile,
					button: {
						text: self.l10n.useFile
					},
					multiple: false
				});

				frame.on('select', function() {
					var attachment = frame.state().get('selection').first().toJSON();

					$input.val(attachment.id);
					if ($input[0]) {
						$input[0].dispatchEvent(new Event('change', { bubbles: true }));
					}
					$info.html('<a href="' + attachment.url + '" target="_blank">' + attachment.filename + '</a>').show();
					$removeBtn.show();
				});

				frame.open();
				return false;
			});

			// File field inside Group/Repeater - Remove
			$(document).off('click.dcfeSubfieldFileRemove').on('click.dcfeSubfieldFileRemove', '.rdcfe-group-field .rdcfe-file-field__remove, .rdcfe-repeater-field .rdcfe-file-field__remove', function(e) {
				e.preventDefault();
				e.stopPropagation();

				var $button = $(this);
				var $field = $button.closest('.rdcfe-file-field');
				var $input = $field.find('input[type="hidden"]').first();
				var $info = $field.find('.rdcfe-file-field__info').first();

				$input.val('');
				if ($input[0]) {
					$input[0].dispatchEvent(new Event('change', { bubbles: true }));
				}
				$info.html('').hide();
				$button.hide();
			});
		},

		// NOTE: The Group, Repeater and Gallery field implementations
		// were removed from this file. They are Pro-only field types
		// whose handlers (group toggle; repeater add/remove/duplicate/
		// reorder/state; gallery add/remove/clear/sortable/state) live
		// in rox-dynamic-cpt-fields-engine-pro/assets/js/rdcfe-pro-fields.js.
		//
		// A legacy duplicate Repeater implementation here used to bind
		// to the same `.rdcfe-repeater-add` / `.rdcfe-repeater-remove`
		// / `.rdcfe-repeater-duplicate` selectors as the Pro module,
		// which appended two rows per click and — more importantly —
		// only the base handler re-initialised Date / Color / Media
		// pickers. The extra row Pro appended therefore showed up as
		// plain text inputs (no jQuery UI datepicker, no Iris swatch).
		// Pro now calls back into `window.RDCFEFields.initDatePickers()`
		// / `initColorPickers()` / `initMediaFields()` after adding
		// or duplicating a row to keep sub-field pickers wired up.
	};

	// Initialize when document is ready
	$(document).ready(function() {
		RDCFEFields.init();
	});

	// Also initialize after a delay for Gutenberg
	$(window).on('load', function() {
		setTimeout(function() {
			RDCFEFields.init();
		}, 500);
	});

	// Expose for external use
	window.RDCFEFields = RDCFEFields;

})(jQuery);
