import type { Sails } from 'sails';
import * as path from 'path';
import { pdfgen } from './config/pdfgen';

try {
  require('@researchdatabox/redbox-core');
} catch (_error) {
  require('@researchdatabox/redbox-core-types');
}

module.exports = function (sails: Sails.Application): Sails.Hook {
  return {
    initialize: function (cb: () => void) {
      const configService = (sails.services as Record<string, any>)?.configservice;
      if (configService?.mergeHookConfig) {
        configService.mergeHookConfig('@researchdatabox/sails-hook-redbox-pdfgen', sails.config);
      } else {
        sails.log.warn('sails-hook-redbox-pdfgen: ConfigService not available, skipping service loading');
      }

      const defaultToken = (sails.config as any)?.auth?.default?.local?.default?.token;
      (sails.config as any).brandingConfigurationDefaults = (sails.config as any).brandingConfigurationDefaults || {};
      (sails.config as any).brandingConfigurationDefaults.pdfgen = {
        ...(sails.config as any).brandingConfigurationDefaults.pdfgen,
        token: (sails.config as any).brandingConfigurationDefaults.pdfgen?.token ?? defaultToken
      };

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
    pdfgen,
    agendaQueue: require('../config/agendaQueue').agendaQueue,
    recordtype: require('../config/recordtype').recordtype
  };
};

module.exports.registerRedboxServices = function () {
  return require('./api/services').ServiceExports;
};

module.exports.ServiceExports = require('./api/services').ServiceExports;
