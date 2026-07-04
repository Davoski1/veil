/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  // Replicate tsconfig paths so Jest resolves workspace aliases
  moduleNameMapper: {
    '^@veil/utils$':    '<rootDir>/../../sdk/src/utils',
    '^@veil/sdk$':      '<rootDir>/../../sdk/src/useInvisibleWallet',
    '^@veil/events$':   '<rootDir>/../../sdk/src/events',
    '^@veil/recovery$': '<rootDir>/../../sdk/src/recovery/sep30',
    '^@veil/backup$':   '<rootDir>/../../sdk/src/backup',
    '^@veil/sep7$':     '<rootDir>/../../sdk/src/sep7',
    // SDK source (compiled from ../../sdk/src) imports @stellar/stellar-sdk,
    // but its sibling sdk/node_modules isn't installed in the wallet CI job.
    // Pin it to the wallet's own copy (mirrors next.config's webpack rule).
    '^@stellar/stellar-sdk$': '<rootDir>/node_modules/@stellar/stellar-sdk',
  },
  setupFilesAfterEnv: [],
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
    '!lib/__tests__/**',
  ],
}

module.exports = config
