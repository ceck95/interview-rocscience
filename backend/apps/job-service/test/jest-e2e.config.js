module.exports = {
  displayName: 'job-service:e2e',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  moduleNameMapper: {
    '^@interview/core$': '<rootDir>/../../libs/shared/core/src/index.ts',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.app.json',
    },
  },
  testTimeout: 30000,
};
