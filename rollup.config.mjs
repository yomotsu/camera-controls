import rollupReplace from '@rollup/plugin-replace';
import rollupTypescript from '@rollup/plugin-typescript';
import typescript from 'typescript';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

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
			format: 'es',
			file: pkg.module,
			banner: license,
			indent: '\t',
			exports: 'named',
		},
		{
			format: 'cjs',
			file: pkg.main,
			banner: license,
			indent: '\t',
			exports: 'named',
		}
	],
	plugins: [
		rollupReplace( { preventAssignment: true, __VERSION: pkg.version } ),
		rollupTypescript( { typescript } ),
	],
};
