const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Run the compiled service and its real RxJS API without lifting a Sails app.
module.exports = function loadPDFService(options) {
  const filename = path.resolve(__dirname, '../../api/services/PDFService.js');
  class Service { exports() { return this; } }
  class Datastream { constructor(data) { Object.assign(this, data); } }
  const context = {
    module: { exports: {} }, exports: {}, console, setTimeout,
    _: require('lodash'), RecordsService: {},
    sails: {
      log: { verbose() {}, debug() {}, warn() {}, error() {} },
      config: {
        appUrl: options.appUrl || 'http://synthetic.invalid', pdfgen: {},
        record: { datastreamService: 'attachments', attachments: { stageDir: options.stageDir } }
      },
      services: { attachments: { addDatastream: options.addDatastream || (async () => {}) } }
    },
    require(name) {
      if (name === '@researchdatabox/redbox-core-types') {
        return { Services: { Core: { Service } }, Datastream };
      }
      if (name === '../../lib/Puppeteer10') return { launch: options.launch };
      if (name === 'os' && options.tmpdir) return { tmpdir: () => options.tmpdir };
      return require(name);
    }
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  const service = context.module.exports;
  service.delay = async () => {};
  return service;
};
