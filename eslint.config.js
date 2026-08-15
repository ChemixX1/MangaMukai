import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // El cliente de WordPress devuelve campos dinámicos que aún no cuentan
      // con un esquema compartido. TypeScript sigue validando el build.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Estos efectos hidratan estado recibido por navegación y temporizadores.
      'react-hooks/set-state-in-effect': 'off',
      // El provider exporta también su hook de consumo de forma intencional.
      'react-refresh/only-export-components': 'off',
    },
  },
])
