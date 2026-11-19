// True in the static GitHub Pages build (`npm run build:example`). That build has no server,
// so screens use the bundled sample data and AI panels replay captured answers.
export const HOSTED_EXAMPLE = process.env.NEXT_PUBLIC_HOSTED_EXAMPLE === 'true';
// Prefix for files in public/ (the hosted build is served under /<repo>/try).
export const BASE_PATH = HOSTED_EXAMPLE ? '/sfguide-auto-finance-portfolio-analytics/try' : '';
export const REPO = 'https://github.com/sfc-gh-ooral/sfguide-auto-finance-portfolio-analytics';
