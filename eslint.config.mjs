import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', 'out/**', 'docs/try/**', 'node_modules/**'] },
  // The hosted example is a static export, so URL params, localStorage, and data loads are read in
  // effects after hydration (they are not available while prerendering). Flag, don't fail.
  { rules: { 'react-hooks/set-state-in-effect': 'warn' } },
];

export default config;
