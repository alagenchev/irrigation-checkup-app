module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.integration.test.ts'],
  transform: { '^.+\\.[jt]sx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }] },
  // Allow ts-jest to transform @faker-js/faker (ESM-only package)
  transformIgnorePatterns: ['/node_modules/(?!@faker-js/faker)'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  // Containers can take up to 60s to start
  testTimeout: 60_000,
}
