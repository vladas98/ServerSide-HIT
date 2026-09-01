'use strict';

module.exports = {
  testEnvironment: 'node',
  // mongodb-memory-server downloads a MongoDB binary on first run, which
  // can be slow, so tests get more headroom than Jest's 5s default.
  testTimeout: 30000,
};
