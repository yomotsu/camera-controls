import babel from 'rollup-plugin-babel'

const license = `/*!
 * camera-controls
 * https://github.com/yomotsu/camera-controls
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */`

export default {
	entry: 'src/camera-controls.js',
	indent: '\t',
	sourceMap: false,
	plugins: [
		babel( {
			exclude: 'node_modules/**',
			presets: [
				[ 'env', {
					targets: {
						browsers: [
							'last 2 versions',
							'ie >= 11'
						]
					},
					loose: true,
					modules: false
				} ]
			]
		} )
	],
	targets: [
		{
			format: 'umd',
			moduleName: 'cameracontrols',
			dest: 'dist/camera-controls.js',
			banner: license
		},
		{
			format: 'es',
			dest: 'dist/camera-controls.module.js',
			banner: license
		}
	]
};
