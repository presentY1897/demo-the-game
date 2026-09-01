import react from '@thegame/config/eslint/react'

export default [
  ...react,
  {
    ignores: ['.next/**', 'out/**', 'next-env.d.ts'],
  },
]
