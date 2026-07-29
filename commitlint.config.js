module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'db', 'ci'],
    ],
    'scope-enum': [
      1,
      'always',
      ['frontend', 'backend', 'database', 'desktop', 'shared', 'docs', 'infra', 'deps', 'security', 'api', 'config'],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
};
