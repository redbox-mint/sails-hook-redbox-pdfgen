"use strict";

module.exports = {
  require: ["chai", "ts-node/register"],
  extension: ["ts", "js", "mjs"],
  recursive: true,
  slow: 2000,
  timeout: "30s",
  ui: "bdd",
  exit: true,
  global: ["sails", "luxon", "moment", "_"],
};

if (process.env.CI === "true") {
  console.log("Mocha running in CI.");
  module.exports.reporter = "mocha-junit-reporter";
  module.exports["reporter-option"] = "mochaFile=./.tmp/junit/backend-mocha/backend-mocha.xml";
} else {
  console.log("Mocha running in local dev.");
  module.exports.reporter = "spec";
}
