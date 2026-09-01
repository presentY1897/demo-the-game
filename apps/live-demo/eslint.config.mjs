import rn from '@thegame/config/eslint/rn'

export default [
  ...rn,
  {
    ignores: ['.expo/**', 'dist/**'],
  },
  {
    files: ['metro.config.js'],
    languageOptions: { sourceType: 'commonjs' },
  },
]
