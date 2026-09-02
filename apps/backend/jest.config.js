const { loadEnv } = require('@medusajs/utils')
loadEnv('test', process.cwd())

module.exports = {
  transform: {
    '^.+\\.[jt]s$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          // Pin target: @swc/jest defaults Node 20+ to "es2023", which the
          // pinned @swc/core 1.5.7 does not understand ("unknown variant es2023").
          target: 'es2022'
        }
      }
    ]
  },
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts', 'json'],
  modulePathIgnorePatterns: ['dist/'],
  // This app holds the only jest setup in the monorepo, but most of the
  // code lives in the workspace packages, so their tests would never be
  // discovered from <rootDir> alone.
  roots: ['<rootDir>', '<rootDir>/../../packages'],
  // Packages build into .medusa/server; without this the compiled copy of
  // each test is collected alongside the source and every case runs twice.
  testPathIgnorePatterns: ['/node_modules/', '/\\.medusa/']
}

if (process.env.TEST_TYPE === 'integration:http') {
  module.exports.testMatch = ['**/integration-tests/http/*.spec.[jt]s']
} else if (process.env.TEST_TYPE === 'integration:modules') {
  module.exports.testMatch = ['**/src/modules/*/__tests__/**/*.[jt]s']
} else if (process.env.TEST_TYPE === 'unit') {
  module.exports.testMatch = ['**/src/**/__tests__/**/*.unit.spec.[jt]s']
}
