const tests = require.context("../imports", true, /\.test\.js$/);
tests.keys().forEach(tests);
