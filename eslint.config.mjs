// React Hook correctness gate.
//
// Two rules are enabled: `rules-of-hooks` (a violation is a runtime crash, so it fails the
// build) and `exhaustive-deps` (a violation is a stale closure, reported as a warning so it
// can be reviewed in context). These are the two the React team ships as its baseline.
//
// The compiler-era rules in `recommended-latest` — `refs`, `purity`, `immutability`,
// `set-state-in-effect` — are intentionally off. This client keeps "latest value" refs that
// are written during render so a stable callback reads the current commit
// (`eventBySeqRef`, `openStepsRef`, `busyEnterRef`), which is the documented pattern the
// `refs` rule rejects, and it resets state on identity change (`sessionId`), which
// `set-state-in-effect` rejects. Enabling those rules would flag deliberate designs
// without pointing at a defect.
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const parser = {
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
  },
}

export default [
  {
    ignores: ['node_modules/**', 'ios/**', 'android/**', 'dist/**', '.expo/**', 'coverage/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    ...parser,
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Hook tests call a hook outside a component on purpose: `react` is mocked, so the hook
    // is a plain function and the test needs no renderer. `rules-of-hooks` cannot express
    // that and reports every such helper, so both rules stay off for tests.
    files: ['tests/**/*.{ts,tsx}'],
    ...parser,
  },
]
