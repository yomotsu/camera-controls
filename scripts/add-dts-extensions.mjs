#!/usr/bin/env node

// to adapt moduleResolution: "nodeNext", file name extension in import statements paths must be specified explicitly.
// This script adds .js extensions to relative import statements in .d.ts files in the dist/ directory.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname( fileURLToPath( import.meta.url ) );

/**
 * Recursively finds all .d.ts files in a directory
 */
function findDtsFiles( dir ) {

	const files = [];
	const items = readdirSync( dir );

	for ( const item of items ) {

		const fullPath = join( dir, item );
		const stat = statSync( fullPath );

		if ( stat.isDirectory() ) {

			files.push( ...findDtsFiles( fullPath ) );

		} else if ( item.endsWith( '.d.ts' ) ) {

			files.push( fullPath );

		}

	}

	return files;

}

/**
 * Adds .js extensions to relative import statements in TypeScript declaration files (.d.ts)
 */
function addExtensionsToDtsFiles() {

	const distDir = join( __dirname, '..', 'dist' );
	const dtsFiles = findDtsFiles( distDir );

	for ( const filePath of dtsFiles ) {

		try {

			const content = readFileSync( filePath, 'utf8' );

			// Match relative import patterns (from './path' or from "../path")
			let updatedContent = content.replace(
				/(from\s+['"])(\.[^'"]+)(['"]\s*;?)/g,
				( match, prefix, importPath, suffix ) => {

					// Skip if extension already exists
					if ( importPath.endsWith( '.js' ) || importPath.endsWith( '.d.ts' ) ) {

						return match;

					}

					// Add .js extension to relative path
					return `${prefix}${importPath}.js${suffix}`;

				}
			);

			// Process export statements similarly (export { } from './path')
			updatedContent = updatedContent.replace(
				/(export\s+(?:{[^}]*}\s+)?from\s+['"])(\.[^'"]+)(['"]\s*;?)/g,
				( match, prefix, importPath, suffix ) => {

					// Skip if extension already exists
					if ( importPath.endsWith( '.js' ) || importPath.endsWith( '.d.ts' ) ) {

						return match;

					}

					// Add .js extension to relative path
					return `${prefix}${importPath}.js${suffix}`;

				}
			);

			// Write file only if content has changed
			if ( updatedContent !== content ) {

				writeFileSync( filePath, updatedContent );
				console.log( `Updated extensions: ${filePath}` );

			}

		} catch ( error ) {

			console.error( `Error processing ${filePath}:`, error );

		}

	}

}

addExtensionsToDtsFiles();
