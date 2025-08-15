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


            sails.log.verbose(PDFService);
      _.set(sails, 'config.brandingConfigurationDefaults.pdfgen', {
        token: sails.config.auth.default.local.default.token
      });
      sails.after('hook:moduleloader:loaded', async () => {
        try {
          const { PDFGenConfig } = require('./api/configmodels/PDFGenConfig');
          sails.log.error('sails.services')
          sails.log.error(sails.services.appconfigservice)
          sails.services.appconfigservice.registerConfigModel(
            {key: 'pdfgen', model: PDFService, modelName: 'PDFGenConfig', title: 'PDF Generation Config', class: PDFGenConfig, tsGlob: __dirname + '/typescript/api/configmodels/*.ts'}
          );
          return cb(); 
        } catch (e) {
          sails.log.error('sails-hook-redbox-pdfgen init failed:', e);
          return cb(e);
        }
      });
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
