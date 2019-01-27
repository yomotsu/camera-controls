import babel from 'rollup-plugin-babel'
import pkg from './package.json';

const license = `/*!
 * camera-controls
 * https://github.com/yomotsu/camera-controls
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */`

export default {
	input: 'src/camera-controls.js',
	output: [
		{
			format: 'umd',
			name: 'CameraControls',
			file: pkg.main,
			banner: license,
			indent: '\t',
		},
		{
			format: 'es',
			file: pkg.module,
			banner: license,
			indent: '\t',
		}
	],
	plugins: [ babel() ],
};
