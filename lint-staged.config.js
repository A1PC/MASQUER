/** @type {import('lint-staged').Configuration} */
export default {
  '*.{ts,tsx,js,jsx}': ['eslint --fix --max-warnings=0 --no-warn-ignored', 'prettier --write'],
  '*.{json,md,css,yml,yaml}': ['prettier --write'],
};
