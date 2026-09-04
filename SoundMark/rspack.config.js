const { defineConfig } = require("@meteorjs/rspack");
const { rspack } = require("@rspack/core");
/**
 * Rspack configuration for Meteor projects.
 *
 * Provides typed flags on the `Meteor` object, such as:
 * - `Meteor.isClient` / `Meteor.isServer`
 * - `Meteor.isDevelopment` / `Meteor.isProduction`
 * - …and other flags available
 *
 * Use these flags to adjust your build settings based on environment.
 */
module.exports = defineConfig((Meteor) => {
  return {
    module: {
      rules: [
        // Add support for importing SVGs as React components
        {
          test: /\.svg$/i,
          issuer: /\.[jt]sx?$/,
          use: ["@svgr/webpack"]
        }
      ]
    },
    resolve: {
      fallback: {
        // chai's browser bundle references Node's `buffer` core module;
        // Rspack no longer polyfills this automatically, so point it at
        // the npm `buffer` package explicitly.
        buffer: require.resolve("buffer/"),
        process: require.resolve("process/browser")
      }
    },
    plugins: [
      // Make the `Buffer` and `process` globals available in the client
      // bundle, since some packages (chai included) expect them to just
      // exist rather than being explicitly imported.
      Meteor.isClient &&
        new rspack.ProvidePlugin({
          Buffer: [require.resolve("buffer"), "Buffer"],
          process: require.resolve("process/browser")
        })
    ].filter(Boolean)
  };
});
