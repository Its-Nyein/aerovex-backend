// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * The public surface of each domain module.
 *
 * Everything else under src/modules/<name>/ is internal and may only be
 * imported from inside that module. This is the code-level half of the
 * modular monolith boundary: without it, `import { UserService } from
 * 'src/modules/user/services/user.service'` compiles happily and the
 * boundaries decay into convention.
 *
 * The module file itself is always public, because the composition root has to
 * wire it up.
 */
const MODULE_PUBLIC_SURFACE = {
  auth: ['guards', 'decorators'],
  billing: ['contracts'],
  role: ['contracts'],
  upload: [],
  user: ['contracts'],
};

/**
 * A single config object, not one per module.
 *
 * Flat config overrides rules by key rather than merging them, so five configs
 * each setting `no-restricted-imports` would leave only the last one active and
 * silently enforce just one module's boundary. All the groups live in one rule
 * instead.
 *
 * No exemption is needed for a module importing itself: every in-module import
 * is relative, so these absolute patterns only ever match a cross-module
 * import.
 */
const moduleBoundaries = {
  files: ['src/**/*.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: Object.entries(MODULE_PUBLIC_SURFACE).map(
          ([name, publicDirs]) => ({
            // Deny everything under the module, then allow back the module file
            // and each published directory. Both entries per directory are
            // required: gitignore semantics cannot re-include a file whose
            // parent directory is excluded.
            group: [
              `src/modules/${name}/*`,
              `src/modules/${name}/**`,
              `!src/modules/${name}/${name}.module`,
              ...publicDirs.flatMap((publicDir) => [
                `!src/modules/${name}/${publicDir}`,
                `!src/modules/${name}/${publicDir}/*`,
              ]),
            ],
            message:
              `Only src/modules/${name}/${name}.module and ` +
              `[${publicDirs.map((d) => `${d}/*`).join(', ') || 'nothing else'}] are public. ` +
              `Import the module's contract instead of reaching into its internals.`,
          }),
        ),
      },
    ],
  },
};

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
    },
  },
  moduleBoundaries,
);
