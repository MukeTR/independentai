<?php
/**
 * Plugin Name:       Independent AI Sensor
 * Plugin URI:        https://independentai.space/
 * Description:       ChatGPT, Claude, Perplexity gibi yapay zekâlardan gelen ziyaretleri ölçer. Çerezsiz, PII'siz, parmak izi yok.
 * Version:           1.0.0
 * Requires at least: 5.7
 * Requires PHP:      7.4
 * Author:            Independent AI
 * License:           GPL-2.0-or-later
 * Text Domain:       independentai-sensor
 *
 * Eklenti yalnızca tek bir <script> etiketi basar; hiçbir veri WordPress üzerinden geçmez,
 * ölçüm doğrudan tarayıcıdan collector'a gider.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Doğrudan erişim yok.
}

define( 'IAI_SENSOR_VERSION', '1.0.0' );
define( 'IAI_SENSOR_OPTION', 'independentai_sensor' );
define( 'IAI_SENSOR_DEFAULT_ENDPOINT', 'https://independentai.space' );

/**
 * Kayıtlı ayarları varsayılanlarla birleştirir.
 *
 * @return array{site_key:string,endpoint:string,respect_dnt:int,skip_logged_in:int}
 */
function iai_sensor_settings() {
	$saved = get_option( IAI_SENSOR_OPTION, array() );
	if ( ! is_array( $saved ) ) {
		$saved = array();
	}

	return array(
		'site_key'       => isset( $saved['site_key'] ) ? (string) $saved['site_key'] : '',
		'endpoint'       => isset( $saved['endpoint'] ) && '' !== $saved['endpoint'] ? (string) $saved['endpoint'] : IAI_SENSOR_DEFAULT_ENDPOINT,
		'respect_dnt'    => ! empty( $saved['respect_dnt'] ) ? 1 : 0,
		'skip_logged_in' => ! empty( $saved['skip_logged_in'] ) ? 1 : 0,
	);
}

/**
 * Formdan gelen değerleri temizler.
 *
 * @param mixed $input Ham girdi.
 * @return array
 */
function iai_sensor_sanitize( $input ) {
	$input    = is_array( $input ) ? $input : array();
	$site_key = isset( $input['site_key'] ) ? sanitize_text_field( wp_unslash( $input['site_key'] ) ) : '';
	$endpoint = isset( $input['endpoint'] ) ? esc_url_raw( wp_unslash( $input['endpoint'] ) ) : '';

	// Public anahtar biçimi: iais_ + base64url. Yanlış biçim sessizce boşa düşer.
	if ( '' !== $site_key && ! preg_match( '/^iais_[A-Za-z0-9_-]{8,110}$/', $site_key ) ) {
		add_settings_error(
			IAI_SENSOR_OPTION,
			'iai_bad_key',
			__( 'Site anahtarı "iais_" ile başlamalıdır. Panelden kopyaladığınız değeri yapıştırın.', 'independentai-sensor' )
		);
		$site_key = '';
	}

	if ( '' !== $endpoint ) {
		$endpoint = untrailingslashit( $endpoint );
		if ( 0 !== strpos( $endpoint, 'https://' ) ) {
			add_settings_error( IAI_SENSOR_OPTION, 'iai_bad_endpoint', __( 'Collector adresi https:// ile başlamalıdır.', 'independentai-sensor' ) );
			$endpoint = '';
		}
	}

	return array(
		'site_key'       => $site_key,
		'endpoint'       => '' !== $endpoint ? $endpoint : IAI_SENSOR_DEFAULT_ENDPOINT,
		'respect_dnt'    => empty( $input['respect_dnt'] ) ? 0 : 1,
		'skip_logged_in' => empty( $input['skip_logged_in'] ) ? 0 : 1,
	);
}

add_action(
	'admin_init',
	function () {
		register_setting(
			'independentai_sensor_group',
			IAI_SENSOR_OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => 'iai_sensor_sanitize',
				'default'           => array(),
			)
		);
	}
);

add_action(
	'admin_menu',
	function () {
		add_options_page(
			__( 'Independent AI Sensor', 'independentai-sensor' ),
			__( 'Independent AI', 'independentai-sensor' ),
			'manage_options',
			'independentai-sensor',
			'iai_sensor_render_settings'
		);
	}
);

/** Ayarlar ekranı. */
function iai_sensor_render_settings() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$settings = iai_sensor_settings();
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Independent AI Sensor', 'independentai-sensor' ); ?></h1>
		<p>
			<?php esc_html_e( 'Panelde site ekledikten sonra size verilen public anahtarı buraya yapıştırın. Çerez yazılmaz, kişisel veri toplanmaz.', 'independentai-sensor' ); ?>
		</p>
		<form method="post" action="options.php">
			<?php settings_fields( 'independentai_sensor_group' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="iai_site_key"><?php esc_html_e( 'Site anahtarı', 'independentai-sensor' ); ?></label></th>
					<td>
						<input type="text" id="iai_site_key" class="regular-text code"
							name="<?php echo esc_attr( IAI_SENSOR_OPTION ); ?>[site_key]"
							value="<?php echo esc_attr( $settings['site_key'] ); ?>" placeholder="iais_…" />
						<p class="description"><?php esc_html_e( 'Gizli değildir; sitenin HTML kaynağında görünür. Yalnızca olay YAZAR.', 'independentai-sensor' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="iai_endpoint"><?php esc_html_e( 'Collector adresi', 'independentai-sensor' ); ?></label></th>
					<td>
						<input type="url" id="iai_endpoint" class="regular-text code"
							name="<?php echo esc_attr( IAI_SENSOR_OPTION ); ?>[endpoint]"
							value="<?php echo esc_attr( $settings['endpoint'] ); ?>" />
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Gizlilik', 'independentai-sensor' ); ?></th>
					<td>
						<label>
							<input type="checkbox" name="<?php echo esc_attr( IAI_SENSOR_OPTION ); ?>[respect_dnt]" value="1" <?php checked( 1, $settings['respect_dnt'] ); ?> />
							<?php esc_html_e( 'DNT / GPC sinyali varsa ölçümü tamamen kapat', 'independentai-sensor' ); ?>
						</label>
						<br />
						<label>
							<input type="checkbox" name="<?php echo esc_attr( IAI_SENSOR_OPTION ); ?>[skip_logged_in]" value="1" <?php checked( 1, $settings['skip_logged_in'] ); ?> />
							<?php esc_html_e( 'Giriş yapmış kullanıcıları ölçme (yönetici trafiğini dışarıda bırakır)', 'independentai-sensor' ); ?>
						</label>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<?php if ( '' !== $settings['site_key'] ) : ?>
			<h2><?php esc_html_e( 'Kurulum durumu', 'independentai-sensor' ); ?></h2>
			<p>
				<?php
				printf(
					/* translators: %s: script URL */
					esc_html__( 'Her sayfanın <head> bölümüne şu script ekleniyor: %s', 'independentai-sensor' ),
					'<code>' . esc_html( $settings['endpoint'] . '/sensor/v1.js' ) . '</code>'
				);
				?>
			</p>
		<?php endif; ?>
	</div>
	<?php
}

/** Sensör etiketini <head> içine basar. */
function iai_sensor_print_tag() {
	$settings = iai_sensor_settings();
	if ( '' === $settings['site_key'] ) {
		return;
	}
	if ( $settings['skip_logged_in'] && is_user_logged_in() ) {
		return;
	}
	if ( function_exists( 'is_customize_preview' ) && is_customize_preview() ) {
		return;
	}

	$attributes = array(
		'src'       => $settings['endpoint'] . '/sensor/v1.js',
		'async'     => true,
		'data-site' => $settings['site_key'],
	);
	if ( $settings['respect_dnt'] ) {
		$attributes['data-respect-dnt'] = '1';
	}

	// wp_print_script_tag özniteliği kendisi kaçışlar (WP 5.7+).
	wp_print_script_tag( $attributes );
}
add_action( 'wp_head', 'iai_sensor_print_tag', 5 );

/** Eklenti listesinde "Ayarlar" bağlantısı. */
add_filter(
	'plugin_action_links_' . plugin_basename( __FILE__ ),
	function ( $links ) {
		$url = admin_url( 'options-general.php?page=independentai-sensor' );
		array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Ayarlar', 'independentai-sensor' ) . '</a>' );
		return $links;
	}
);

/** Eklenti silinince ayar kaydı temizlenir. */
register_uninstall_hook( __FILE__, 'iai_sensor_uninstall' );

/** Uninstall callback. */
function iai_sensor_uninstall() {
	delete_option( IAI_SENSOR_OPTION );
}
