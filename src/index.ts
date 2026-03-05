import type { Sails } from 'sails';
import * as path from 'path';
import { pdfgen } from './config/pdfgen';

require('@researchdatabox/redbox-core');


module.exports = function (sails: Sails.Application): Sails.Hook {
  return {
    initialize: function (cb: () => void) {
      const configService = (sails.services as Record<string, any>)?.configservice;
      if (configService?.mergeHookConfig) {
        configService.mergeHookConfig('@researchdatabox/sails-hook-redbox-pdfgen', sails.config);
      } else {
        sails.log.warn('sails-hook-redbox-pdfgen: ConfigService not available, skipping service loading');
      }

      sails.after('hook:moduleloader:loaded', () => {
        try {
          const { PDFGenConfig } = require('./api/configmodels/PDFGenConfig');
          const appConfigService = (sails.services as Record<string, any>)?.appconfigservice;
          if (appConfigService?.registerConfigModel) {
            appConfigService.registerConfigModel({
              key: 'pdfgen',
              modelName: 'PDFGenConfig',
              title: 'PDF Generation Config',
              class: PDFGenConfig,
              tsGlob: path.join(__dirname, '../src/api/configmodels/*.ts')
            });
          } else {
            sails.log.warn('sails-hook-redbox-pdfgen: AppConfigService not available, skipping config model registration');
          }
        } catch (e) {
          sails.log.error('sails-hook-redbox-pdfgen: Failed to register config model:', e);
        }
      });

      return cb();
    },
    routes: {
      before: {},
      after: {}
    },
    configure: function () {},
    defaults: {
      __configKey__: {
        _hookTimeout: 120000
      }
    }
  };
};

module.exports.registerRedboxConfig = function () {
  return {
    pdfgen
  };
};

module.exports.registerRedboxServices = function () {
  return require('./api/services').ServiceExports;
};

module.exports.ServiceExports = require('./api/services').ServiceExports;
