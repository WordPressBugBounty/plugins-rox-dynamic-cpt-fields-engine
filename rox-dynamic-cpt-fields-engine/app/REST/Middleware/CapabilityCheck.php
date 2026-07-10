<?php
/**
 * Capability Check Middleware
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\REST\Middleware;

use WP_REST_Request;
use WP_Error;

/**
 * Class CapabilityCheck
 *
 * Middleware for checking user capabilities.
 */
class CapabilityCheck {

	/**
	 * Default required capability.
	 *
	 * @var string
	 */
	private string $default_capability = 'manage_options';

	/**
	 * Check if user is authenticated and has required capability.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @param string|null     $capability Optional specific capability to check.
	 * @return bool|WP_Error
	 */
	public function check( WP_REST_Request $request, ?string $capability = null ): bool|WP_Error {
		// Check authentication.
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'rest_not_logged_in',
				__( 'You must be logged in to perform this action.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 401 )
			);
		}

		// Check capability.
		$cap = $capability ?? $this->default_capability;

		if ( ! current_user_can( $cap ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You do not have sufficient permissions.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Check if user can manage options (admin-level).
	 *
	 * @return bool|WP_Error
	 */
	public function check_admin(): bool|WP_Error {
		return $this->check( new WP_REST_Request(), 'manage_options' );
	}

	/**
	 * Check if user can edit posts.
	 *
	 * @return bool|WP_Error
	 */
	public function check_editor(): bool|WP_Error {
		return $this->check( new WP_REST_Request(), 'edit_posts' );
	}

	/**
	 * Check if user can edit a specific post.
	 *
	 * @param int $post_id The post ID.
	 * @return bool|WP_Error
	 */
	public function check_edit_post( int $post_id ): bool|WP_Error {
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'rest_not_logged_in',
				__( 'You must be logged in to perform this action.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 401 )
			);
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to edit this post.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Verify REST nonce.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return bool|WP_Error
	 */
	public function verify_nonce( WP_REST_Request $request ): bool|WP_Error {
		$nonce = $request->get_header( 'X-WP-Nonce' );

		if ( empty( $nonce ) ) {
			$nonce = $request->get_param( '_wpnonce' );
		}

		if ( empty( $nonce ) || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new WP_Error(
				'rest_invalid_nonce',
				__( 'Invalid or missing security token.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}
}

