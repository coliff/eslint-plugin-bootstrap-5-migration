"use strict";

module.exports = {
  rules: {
    "no-v4-classes": require("./rules/no-v4-classes.js"),
    // Backward-compatible alias for early alpha configs.
    "no-v5-classes": require("./rules/no-v4-classes.js"),
  },
};
