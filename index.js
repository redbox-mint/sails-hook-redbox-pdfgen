const _ = require('lodash');
var configService = require('../../../api/services/ConfigService.js');

module.exports = function (sails) {
  return {
    initialize: function (cb) {
      sails.log.verbose('PDF SERVICE INITIALISING')
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
