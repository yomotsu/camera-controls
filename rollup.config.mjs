import pkg from './package.json' assert { type: 'json' };
import rollupReplace from '@rollup/plugin-replace';
import rollupTypescript from '@rollup/plugin-typescript';
import typescript from 'typescript';

const license = `/*!
 * ${ pkg.name }
 * https://github.com/${ pkg.repository }
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */`;

export default {
	input: 'src/index.ts',
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
	plugins: [
		rollupReplace( { preventAssignment: true, __VERSION: pkg.version } ),
		rollupTypescript( { typescript } ),
	],
};
