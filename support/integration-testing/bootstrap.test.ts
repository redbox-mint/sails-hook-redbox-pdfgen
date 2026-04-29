import sails from "sails";
import _ from "lodash";
import { DateTime } from "luxon";

(global as any).DateTime = DateTime;

function loadRedboxCore() {
  const resolvePaths = [
    process.cwd(),
    process.env.RBPORTAL_HOOK_DIR,
    process.env.RBPORTAL_EXTRA_NODE_MODULES,
  ].filter(Boolean) as string[];
  const redboxCorePath = require.resolve("@researchdatabox/redbox-core", { paths: resolvePaths });
  return require(redboxCorePath);
}

before(function (this: Mocha.Context, done) {
  import("chai").then((chai) => {
    (global as any).chai = chai;
    (global as any).should = (chai as any).should();
    (global as any).expect = (chai as any).expect;

    this.timeout(5 * 60 * 1000);

    const { generateAllShims } = loadRedboxCore();
    generateAllShims(process.cwd(), {
      forceRegenerate: process.env.REGENERATE_SHIMS === "true",
      verbose: process.env.SHIM_VERBOSE === "true",
    })
      .then(() => {
        (sails as any).lift(
          {
            log: {
              level: "verbose",
            },
            hooks: {
              grunt: false,
            },
            models: {
              datastore: "mongodb",
              migrate: "drop",
            },
            security: {
              csrf: false,
            },
            datacite: {
              username: process.env.datacite_username,
              password: process.env.datacite_password,
              doiPrefix: process.env.datacite_doiPrefix,
            },
            auth: {
              default: {
                local: {
                  default: {
                    token: "jA8mF8CBpwHGkJqlgg6dT3hEDoZTQIif5t1V9ElIcN8=",
                  },
                },
              },
            },
          },
          (err: Error | undefined, _server: unknown) => {
            if (err) return done(err);
            done(err, sails as any);
          }
        );
      })
      .catch((err: Error) => {
        console.error("Failed to generate shims before lift:", err);
        done(err);
      });
  });
});

after(function (done) {
  if (sails && _.isFunction((sails as any).lower)) {
    (sails as any).lower(done);
  }
});
