const _ = require('lodash');

const PDFService = require('./api/services/PDFService')

module.exports = function (sails) {
  return {
    initialize: function (cb) {
      // Do Some initialisation tasks
      // This can be for example: copy files or images to the redbox-portal front end
      return cb();
    },
    //If each route middleware do not exist sails.lift will fail during hook.load()
    routes: {
      before: {},
      after: {}
    },
    configure: function () {
      sails.log.verbose('PDF SERVICE INITIALISING')
      sails.log.verbose(PDFService);
      PDFService.initPool();
      sails.services['pdfservice'] = PDFService;
    }
  }
};
