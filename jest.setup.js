// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

require('@testing-library/jest-dom')

// Mock fetch globally for tests
global.fetch = jest.fn()

// Reset mocks after each test
afterEach(() => {
  jest.resetAllMocks()
})