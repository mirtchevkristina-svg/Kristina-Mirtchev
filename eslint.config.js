import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.tsbuildinfo'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Geldbetraege sind bigint; ein versehentlicher Vergleich mit number
      // waere ein echter Fehler und soll auffallen.
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        {
          // CLAUDE.md 1.6: keine Gleitkomma-Arithmetik auf Geldbetraegen.
          selector: "BinaryExpression[operator='/'] > Literal[value=100]",
          message:
            'Division durch 100 deutet auf eine Euro-Umrechnung hin. Beträge bleiben in Cent; nutze @fp/money.',
        },
      ],
    },
  },
  {
    // Die beiden einzigen Stellen, an denen durch 100 geteilt werden darf:
    // die Cent-zu-Euro-Darstellung der Money-Library und die Umrechnung von
    // Basispunkten in Prozent. Beides ist reine Formatierung, keine
    // Geldarithmetik. Ueberall sonst bleibt die Regel scharf.
    files: ['lib/money/src/format.ts', 'lib/legal-config/src/caps.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.test.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
