<?php
/**
 * Location Matcher
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields;

/**
 * Class LocationMatcher
 *
 * Matches field groups to screens based on location rules.
 */
class LocationMatcher {

	/**
	 * Pro-only location-rule params.
	 *
	 * These params require the Pro plugin to be active to evaluate
	 * meaningfully — Pro registers the actual evaluators via the
	 * `rdcfe_location_match_rule` and `rdcfe_location_context_value`
	 * filters. When Pro is inactive we explicitly fail-closed on these
	 * params (the rule returns false) so that a config saved while Pro
	 * was active doesn't silently drift to a different match set after
	 * deactivation, e.g. by accidentally satisfying an `==` compare
	 * against an empty default context value.
	 *
	 * @var array<int, string>
	 */
	private const PRO_PARAMS = array(
		'page_template',
		'post_parent',
		'post_author',
		'post_format',
		'post_taxonomy',
		'current_user_role',
		'current_user_capability',
	);

	/**
	 * Normalize stored location payloads to strict OR-groups of AND-rules.
	 *
	 * Canonical form: `[ [ rule, … ], … ]`, each rule is an associative row
	 * with `param` (plus `operator` / `value`). Some callers persist a lone
	 * rule object (`param`/`operator`/`value` at top level), or a single AND
	 * group flattened to one associative array, or an extra-nested `[ [ [
	 * … ] ] ]` shape — all of those would iterate scalars inside
	 * `matches_group()` and fatal under `matches_rule()` without this pass.
	 *
	 * @param array<mixed> $location Raw location from storage / importers / AI payloads.
	 * @return array<int, array<int, array<string, mixed>>>
	 */
	public static function normalize_location_groups( array $location ): array {
		if ( isset( $location['param'] ) && ! array_is_list( $location ) ) {
			return array( array( $location ) );
		}

		if ( empty( $location ) ) {
			return array();
		}

		if ( ! array_is_list( $location ) ) {
			return array();
		}

		// Top-level `[ {rule}, … ]` ⇒ one AND group (`useMetaboxes.normalizeLocations`).
		$flat_rule_rows = true;
		foreach ( $location as $row ) {
			if ( ! is_array( $row ) || ! isset( $row['param'] ) ) {
				$flat_rule_rows = false;
				break;
			}
			if ( array_is_list( $row ) ) {
				$flat_rule_rows = false;
				break;
			}
		}

		if ( $flat_rule_rows ) {
			$clean = array_values(
				array_filter(
					$location,
					static fn( mixed $row ): bool => is_array( $row ) && isset( $row['param'] )
				)
			);

			return array() !== $clean ? array( $clean ) : array();
		}

		$out = array();
		foreach ( $location as $maybe_group ) {
			if ( ! is_array( $maybe_group ) ) {
				continue;
			}

			// Peel `[[[rule]]]`-style wrappers.
			while (
				array_is_list( $maybe_group )
				&& 1 === count( $maybe_group )
				&& isset( $maybe_group[0] )
				&& is_array( $maybe_group[0] )
				&& isset( $maybe_group[0]['param'] )
			) {
				$maybe_group = $maybe_group[0];
			}

			// One rule erroneously saved where `[ rule ]` was expected.
			if ( isset( $maybe_group['param'] ) && ! array_is_list( $maybe_group ) ) {
				$out[] = array( $maybe_group );
				continue;
			}

			$rules = array();
			foreach ( $maybe_group as $maybe_rule ) {
				if ( is_array( $maybe_rule ) && isset( $maybe_rule['param'] ) ) {
					$rules[] = $maybe_rule;
				}
			}

			if ( array() !== $rules ) {
				$out[] = array_values( $rules );
			}
		}

		return array_values(
			array_filter(
				$out,
				static fn( array $rules ): bool => array() !== $rules
			)
		);
	}

	/**
	 * Check if a field group matches the current screen.
	 *
	 * Location rules are organised as groups of rules:
	 *   - OR semantics between groups (any group matching wins).
	 *   - AND semantics within a group (every rule must match).
	 *
	 * Multiple groups (OR groups) are a Pro UI feature, but the matcher
	 * itself stays backwards-compat — a config persisted while Pro was
	 * active (with multiple groups) keeps working if Pro is later
	 * deactivated, except that any Pro-only params inside those groups
	 * fail to match (see `matches_rule()`).
	 *
	 * @param array<string, mixed> $field_group The field group configuration.
	 * @param array<string, mixed> $context The current context.
	 * @return bool
	 */
	public function matches( array $field_group, array $context ): bool {
		$raw_location   = $field_group['location'] ?? array();
		$location_rules = self::normalize_location_groups( is_array( $raw_location ) ? $raw_location : array() );

		if ( empty( $location_rules ) ) {
			return false;
		}

		foreach ( $location_rules as $rule_group ) {
			if ( $this->matches_group( $rule_group, $context ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if a rule group matches.
	 *
	 * @param array<array<string, mixed>> $rule_group Array of rules (AND).
	 * @param array<string, mixed>        $context The current context.
	 * @return bool
	 */
	private function matches_group( array $rule_group, array $context ): bool {
		foreach ( $rule_group as $rule ) {
			if ( ! is_array( $rule ) || ! isset( $rule['param'] ) ) {
				return false;
			}
			if ( ! $this->matches_rule( $rule, $context ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Check if a single rule matches.
	 *
	 * Pro-only params (`page_template`, `post_parent`, `post_author`,
	 * `post_format`, `post_taxonomy`, `current_user_role`,
	 * `current_user_capability`) fail closed when Pro is inactive — the
	 * rule returns false. The Pro plugin overrides this by either:
	 *
	 *   1. Setting `rdcfe_is_pro_active` to true (so we let the default
	 *      compare path run after Pro has filled in the context value
	 *      via `rdcfe_location_context_value`), or
	 *   2. Short-circuiting via `rdcfe_location_match_rule` for params
	 *      that aren't a value compare (e.g. capability checks).
	 *
	 * @param array<string, mixed> $rule The rule configuration.
	 * @param array<string, mixed> $context The current context.
	 * @return bool
	 */
	private function matches_rule( array $rule, array $context ): bool {
		$param    = $rule['param'] ?? '';
		$operator = $rule['operator'] ?? '==';
		$value    = $rule['value'] ?? '';

		/**
		 * Allow add-ons (e.g. the Pro plugin) to fully override matching for
		 * specific params that don't fit the standard equality compare —
		 * `current_user_capability` for instance is a `current_user_can()`
		 * check, not a value match.
		 *
		 * Return `null` to fall through to the default compare. Return a bool
		 * to short-circuit with that result.
		 *
		 * @since 1.0.0
		 *
		 * @param bool|null            $custom Override result, or `null` for default.
		 * @param string               $param Rule parameter.
		 * @param string               $operator Rule operator (`==`, `!=`, `contains`).
		 * @param mixed                $value Rule value.
		 * @param array<string, mixed> $context Current context array.
		 */
		$custom = apply_filters( 'rdcfe_location_match_rule', null, $param, $operator, $value, $context );
		if ( null !== $custom ) {
			return (bool) $custom;
		}

		// Pro-only param guard: when Pro is inactive, fail closed instead of
		// falling through to the default `'' == $value` compare which would
		// produce inconsistent results (e.g. `post_format != 'standard'`
		// silently matching everything because the empty default isn't equal
		// to `'standard'`). Pro's `enable_pro_features()` flips
		// `rdcfe_is_pro_active` so this guard short-circuits to false only
		// when the Pro plugin really isn't loaded.
		if ( in_array( $param, self::PRO_PARAMS, true ) && ! $this->is_pro_active() ) {
			return false;
		}

		$context_value = $this->get_context_value( $param, $context );

		return $this->compare( $context_value, $operator, $value );
	}

	/**
	 * Whether the Pro plugin is currently loaded.
	 *
	 * Mirrors the check used by `OptionsPagesEndpoint` and `AdminAssets`.
	 * Cached per request — the filter result can't change mid-request and
	 * `matches_rule()` runs once per location rule per metabox lookup.
	 *
	 * @return bool
	 */
	private function is_pro_active(): bool {
		static $is_pro_active = null;

		if ( null === $is_pro_active ) {
			$is_pro_active = (bool) apply_filters( 'rdcfe_is_pro_active', false );
		}

		return $is_pro_active;
	}

	/**
	 * Get the context value for a parameter.
	 *
	 * @param string               $param The parameter name.
	 * @param array<string, mixed> $context The current context.
	 * @return mixed
	 */
	private function get_context_value( string $param, array $context ): mixed {
		$value = match ( $param ) {
			'post_type'     => $context['post_type'] ?? '',
			'post_template' => $context['post_template'] ?? '',
			'post_status'   => $context['post_status'] ?? '',
			'post_format'   => $context['post_format'] ?? '',
			'post_category' => $context['post_category'] ?? array(),
			'post_taxonomy' => $context['post_taxonomy'] ?? array(),
			'post'          => $context['post_id'] ?? 0,
			'page_parent'   => $context['page_parent'] ?? 0,
			'page_type'     => $context['page_type'] ?? '',
			'current_user'  => $context['current_user'] ?? 0,
			// `user_role` is the *edited* user's role and only resolves on
			// user-form screens; the post/term/options contexts deliberately
			// omit this key so a rule like `user_role == administrator` no
			// longer leaks onto every post edit screen for any admin viewer.
			// Permission-style "current logged-in user" checks belong on the
			// `current_user_role` / `current_user_capability` Pro params.
			'user_role'     => $context['user_role'] ?? array(),
			// `user_form` is set only by `build_user_context()` and identifies
			// which user-management form is currently rendering: `add`,
			// `edit`, `profile`, or the `all` wildcard.
			'user_form'     => $context['user_form'] ?? '',
			'taxonomy'      => $context['taxonomy'] ?? '',
			'term'          => $context['term_id'] ?? 0,
			'options_page'  => $context['options_page'] ?? '',
			default         => $context[ $param ] ?? '',
		};

		/**
		 * Filter the resolved context value for a given location-rule param.
		 * Pro can use this to map UI param names that don't have a direct
		 * context key (e.g. `page_template` → `post_template`).
		 *
		 * @since 1.0.0
		 *
		 * @param mixed                $value The resolved value (or empty default).
		 * @param string               $param The rule parameter being resolved.
		 * @param array<string, mixed> $context The current context array.
		 */
		return apply_filters( 'rdcfe_location_context_value', $value, $param, $context );
	}

	/**
	 * Compare values using the specified operator.
	 *
	 * @param mixed  $context_value The context value.
	 * @param string $operator The comparison operator.
	 * @param mixed  $rule_value The rule value.
	 * @return bool
	 */
	private function compare( mixed $context_value, string $operator, mixed $rule_value ): bool {
		return match ( $operator ) {
			'=='       => $this->equals( $context_value, $rule_value ),
			'!='       => ! $this->equals( $context_value, $rule_value ),
			'contains' => $this->contains( $context_value, $rule_value ),
			default    => false,
		};
	}

	/**
	 * Check equality.
	 *
	 * @param mixed $a First value.
	 * @param mixed $b Second value.
	 * @return bool
	 */
	private function equals( mixed $a, mixed $b ): bool {
		// Handle "all" special value.
		if ( 'all' === $b ) {
			return ! empty( $a );
		}

		// Handle array contains.
		if ( is_array( $a ) ) {
			return in_array( $b, $a, true );
		}

		return (string) $a === (string) $b;
	}

	/**
	 * Check if value contains another value.
	 *
	 * @param mixed $haystack The value to search in.
	 * @param mixed $needle The value to search for.
	 * @return bool
	 */
	private function contains( mixed $haystack, mixed $needle ): bool {
		if ( is_array( $haystack ) ) {
			return in_array( $needle, $haystack, true );
		}

		if ( is_string( $haystack ) && is_string( $needle ) ) {
			return str_contains( $haystack, $needle );
		}

		return false;
	}

	/**
	 * Build context from a post.
	 *
	 * @param \WP_Post|int $post The post or post ID.
	 * @return array<string, mixed>
	 */
	public function build_post_context( \WP_Post|int $post ): array {
		if ( is_int( $post ) ) {
			$post = get_post( $post );
		}

		if ( ! $post ) {
			return array();
		}

		$context = array(
			'post_id'       => $post->ID,
			'post_type'     => $post->post_type,
			'post_status'   => $post->post_status,
			'post_template' => get_page_template_slug( $post->ID ),
			'post_format'   => get_post_format( $post->ID ) ?: 'standard',
			'page_parent'   => $post->post_parent,
		);

		// Determine page type.
		if ( 'page' === $post->post_type ) {
			if ( (int) get_option( 'page_on_front' ) === $post->ID ) {
				$context['page_type'] = 'front_page';
			} elseif ( (int) get_option( 'page_for_posts' ) === $post->ID ) {
				$context['page_type'] = 'posts_page';
			} elseif ( $post->post_parent ) {
				$context['page_type'] = 'child';
			} else {
				$context['page_type'] = 'parent';
			}
		}

		// Get taxonomies.
		$taxonomies = get_object_taxonomies( $post->post_type );
		foreach ( $taxonomies as $taxonomy ) {
			$terms = wp_get_object_terms( $post->ID, $taxonomy, array( 'fields' => 'ids' ) );
			if ( ! is_wp_error( $terms ) ) {
				$context[ 'post_taxonomy_' . $taxonomy ] = $terms;
			}
		}

		// Logged-in viewer — used by Pro params like `current_user_role` /
		// `current_user_capability`. We deliberately do NOT set `user_role`
		// here: the free `user_role` param targets the user being *edited*
		// on profile/edit-user screens, not the current viewer. Otherwise
		// any field group with `user_role == administrator` would render on
		// every post edit screen the moment an administrator opened it.
		$context['current_user'] = get_current_user_id();

		/**
		 * Filter the post context array used by the location matcher.
		 * Pro can extend it with extra keys like `post_author`,
		 * a flattened `post_taxonomy`, `current_user_role`, etc.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string, mixed> $context The built post context.
		 * @param \WP_Post             $post The post being evaluated.
		 */
		return apply_filters( 'rdcfe_location_post_context', $context, $post );
	}

	/**
	 * Build context for a term.
	 *
	 * @param \WP_Term|int $term The term or term ID.
	 * @param string       $taxonomy The taxonomy slug.
	 * @return array<string, mixed>
	 */
	public function build_term_context( \WP_Term|int $term, string $taxonomy = '' ): array {
		if ( is_int( $term ) ) {
			$term = get_term( $term, $taxonomy );
		}

		if ( ! $term || is_wp_error( $term ) ) {
			return array();
		}

		// `user_role` intentionally absent — see notes in build_post_context().
		$context = array(
			'term_id'      => $term->term_id,
			'taxonomy'     => $term->taxonomy,
			'current_user' => get_current_user_id(),
		);

		/**
		 * Filter the term context array used by the location matcher.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string, mixed> $context The built term context.
		 * @param \WP_Term             $term The term being evaluated.
		 */
		return apply_filters( 'rdcfe_location_term_context', $context, $term );
	}

	/**
	 * Build context for a user-management screen.
	 *
	 * Used to evaluate field-group location rules on the user-edit, profile
	 * and add-user screens. The `user_form` key tells the matcher *which*
	 * screen we're on so a free-tier `user_form` rule (e.g. only show on
	 * Edit User, not Add User) can be authored without Pro.
	 *
	 * Accepted `$form_type` values: `add`, `edit`, `profile`, `all`.
	 *
	 * @param \WP_User|int $user      The user or user ID. Pass `0` on the
	 *                                Add New User screen where no user
	 *                                exists yet.
	 * @param string       $form_type Which user form is rendering.
	 * @return array<string, mixed>
	 */
	public function build_user_context( \WP_User|int $user, string $form_type = 'edit' ): array {
		// Add-user screen has no $user yet; build a minimal context so
		// `user_form == add` rules can still match.
		if ( 0 === $user || ( is_int( $user ) && $user <= 0 ) ) {
			$context = array(
				'user_id'      => 0,
				'user_role'    => array(),
				'user_form'    => $form_type,
				'current_user' => get_current_user_id(),
			);

			/** This filter is documented below. */
			return apply_filters( 'rdcfe_location_user_context', $context, null );
		}

		if ( is_int( $user ) ) {
			$user = get_userdata( $user );
		}

		if ( ! $user ) {
			return array();
		}

		$context = array(
			'user_id'      => $user->ID,
			'user_role'    => $user->roles,
			'user_form'    => $form_type,
			'current_user' => get_current_user_id(),
		);

		/**
		 * Filter the user context array used by the location matcher.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string, mixed> $context The built user context.
		 * @param \WP_User|null        $user The user being evaluated, or
		 *                                   null on the add-user screen.
		 */
		return apply_filters( 'rdcfe_location_user_context', $context, $user );
	}

	/**
	 * Build context for options page.
	 *
	 * @param string $page_slug The options page slug.
	 * @return array<string, mixed>
	 */
	public function build_options_context( string $page_slug ): array {
		// `user_role` intentionally absent — see notes in build_post_context().
		$context = array(
			'options_page' => $page_slug,
			'current_user' => get_current_user_id(),
		);

		/**
		 * Filter the options-page context array used by the location matcher.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string, mixed> $context The built options context.
		 * @param string               $page_slug The options page slug.
		 */
		return apply_filters( 'rdcfe_location_options_context', $context, $page_slug );
	}
}

