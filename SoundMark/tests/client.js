// tests/client.js
const tests = require.context("../imports/ui", true, /\.test\.js$/);
tests.keys().forEach(tests);
