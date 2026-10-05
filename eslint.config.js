const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");

module.exports = [
  ...nextCoreWebVitals,
  {
    name: "project/generated-artifacts",
    ignores: [
      "dist-electron/**",
      "dist-server/**",
      "electron-dist/**",
      "distribute/**",
      "distribute_server/**",
      "temp-server-build/**",
      "release/**",
      "public/docs-assets/**",
      "public/openapi.json",
    ],
  },
];
