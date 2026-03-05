const _ = require('lodash');

module.exports = function (sails) {
  return {
    initialize: function (cb) {
      if (sails.services && sails.services.configservice) {
        sails.services.configservice.mergeHookConfig(
          '@researchdatabox/sails-hook-redbox-pdfgen', sails.config
        );
      } else {
        sails.log.warn('sails-hook-redbox-pdfgen: ConfigService not available, skipping service loading');
      }

      _.set(sails, 'config.brandingConfigurationDefaults.pdfgen', {
        token: _.get(sails, 'config.auth.default.local.default.token')
      });

      sails.after('hook:moduleloader:loaded', () => {
        try {
          const PDFService = sails.services['pdfservice'];
          const { PDFGenConfig } = require('./dist/api/configmodels/PDFGenConfig');
          if (sails.services.appconfigservice) {
            sails.services.appconfigservice.registerConfigModel({
              key: 'pdfgen',
              model: PDFService,
              modelName: 'PDFGenConfig',
              title: 'PDF Generation Config',
              class: PDFGenConfig,
              tsGlob: __dirname + '/src/api/configmodels/*.ts'
            });
          }
        } catch (e) {
          sails.log.error('sails-hook-redbox-pdfgen: Failed to register config model:', e);
        }
      });

      return cb();
    },
    routes: { before: {}, after: {} },
    configure: function () {},
    defaults: {}
  }
};

module.exports.registerRedboxConfig = function () {
  return {
    pdfgen: require('./dist/config/pdfgen').pdfgen,
    agendaQueue: require('./config/agendaQueue').agendaQueue,
    recordtype: require('./config/rdmp-recordtype').recordtype
  };
};

module.exports.registerRedboxServices = function () {
  return require('./dist/api/services').ServiceExports;
};

module.exports.ServiceExports = require('./dist/api/services').ServiceExports;
