import storybook from "eslint-plugin-storybook";

import globals from "globals";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import styPlugin from "@stylistic/eslint-plugin";

// https://www.npmjs.com/package/eslint-config-mdcs
const mdcs = {
	globals: {
		THREE: "readonly",
		console: "writable",
	},

	rules: {
		"array-bracket-spacing": [
			"error",
			"always",
			{ singleValue: true, arraysInArrays: false }
		],
		"block-spacing": [ "error", "always" ],
		"brace-style": [ "error", "1tbs", { allowSingleLine: true } ],
		"comma-spacing": [ "error", { before: false, after: true } ],
		"comma-style": [ "error", "last" ],
		"computed-property-spacing": [ "error", "always" ],
		"eol-last": [ "error", "always" ],
		"func-call-spacing": [ "error", "never" ],
		"indent": [ "error", "tab", { SwitchCase: 1 } ],
		"key-spacing": [ "error", { beforeColon: false } ],
		"new-parens": "error",
		"no-trailing-spaces": [ "error", { skipBlankLines: false } ],
		"no-whitespace-before-property": "error",
		"object-curly-spacing": [ "error", "always" ],
		"padded-blocks": [
			"error",
			{
				blocks: "always",
				switches: "always",
				classes: "always"
			}
		],
		"semi": [
			"error",
			"always",
			{ "omitLastInOneLineBlock": true }
		],
		"semi-spacing": [ "error", { before: false, after: true } ],
		"space-before-blocks": [ "error", {
			functions: "always",
			keywords: "always",
			classes: "always"
		} ],
		"space-before-function-paren": [
			"error",
			{
				anonymous: "always",
				named: "never",
				asyncArrow: "ignore"
			}
		],
		"space-in-parens": [ "error", "always" ],
		"space-infix-ops": [ "error" ],
		"space-unary-ops": [
			"error",
			{
				words: true,
				nonwords: true,
				overrides: {}
			}
		],
		"keyword-spacing": [ "error", { before: true, after: true } ],
		"padding-line-between-statements": [
			"error",
			{ blankLine: "always", prev: "block-like", next: "*" }
		],
		"no-multi-spaces": "error",
		"no-undef": "warn",
		"no-unused-vars": "warn",
		"no-extra-semi": "warn"
	}
};

export default [
	{
		files: [ "**/*.ts", "**/*.mjs" ],
		// ignores: [],
		languageOptions: {
			parser: tsParser,
			globals: {
				...globals.browser,
				...globals.node,
				...mdcs.globals,
			},
		},

		plugins: {
			"@typescript-eslint": tsPlugin,
			"@stylistic": styPlugin,
		},

		rules: {
			...mdcs.rules,
			"no-unused-vars": 0,
			"@typescript-eslint/no-unused-vars": 1,
			"indent": 0,
			"@stylistic/indent": [
				"error",
				"tab",
				{
					SwitchCase: 1,
					flatTernaryExpressions: true,
				},
			],
			"no-multi-spaces": [ 0 ],
			"no-trailing-spaces": [
				"error",
				{
					ignoreComments: true,
				},
			],
			"key-spacing": [ 0 ],
		},
	}, ...storybook.configs[ "flat/recommended" ] ];
