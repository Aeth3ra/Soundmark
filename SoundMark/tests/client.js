// tests/client.js
const tests = require.context("../imports/ui", true, /\.test\.jsx?$/);
tests.keys().forEach(tests);
