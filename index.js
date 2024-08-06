const _ = require('lodash');
var configService = require('../../../api/services/ConfigService.js');

module.exports = function (sails) {
  return {
    initialize: function (cb) {
      sails.log.verbose('PDF SERVICE INITIALISING');
      // Do Some initialisation tasks
      let PDFService = null;
      if (!_.isEmpty(configService) && _.isFunction(configService.mergeHookConfig)) {
        configService.mergeHookConfig('@researchdatabox/sails-hook-redbox-pdfgen', sails.config);
        PDFService = sails.services['pdfservice'];
      } else {
        sails.log.warn("Warning PDF Plugin in compatibility mode.");
        PDFService = require('./api/services/PDFService');
        sails.services['pdfservice'] = PDFService;
      }

      const environment = process.env.NODE_ENV || 'development';
      if (environment && ['test', 'development', 'docker'].includes(environment)) {
        if (!_.isUndefined(sails.config.auth.default.local.default.token) && !_.isEmpty(sails.config.auth.default.local.default.token)) {
          const enabledTypes = ["rdmp",];
          for (let enabledType of enabledTypes) {
            sails.log.verbose(`PDFService::Adding token for recordtype ${enabledType}`)
            sails.config.recordtype[enabledType].hooks.onCreate.post[0].options.triggerConfiguration.options.token = sails.config.auth.default.local.default.token;
            sails.config.recordtype[enabledType].hooks.onUpdate.post[0].options.triggerConfiguration.options.token = sails.config.auth.default.local.default.token;
          }
        }
      }

      sails.log.verbose(PDFService);
      return cb();
    },
    //If each route middleware do not exist sails.lift will fail during hook.load()
    routes: {
      before: {},
      after: {}
    },
    configure: function () {
    }
  }
};
