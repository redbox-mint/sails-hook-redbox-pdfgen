const Sails = require('sails').Sails;
const assert = require('assert');
var supertest = require('supertest');

const TemplateService = require('../api/services/TemplateService');

describe('Basic tests ::', function () {

  // Var to hold a running sails app instance
  var sails;
  // Before running any tests, attempt to lift Sails
  before(function (done) {

    // Hook will timeout in 10 seconds
    this.timeout(11000);

    // Attempt to lift sails
    Sails().lift({
      hooks: {
        // Load the hook
        "sails-hook-redbox-template": require('../'),
        // Skip grunt (unless your hook uses it)
        "grunt": false
      },
      form: {forms: {}}, //Mock forms to test hook.configure()
      log: {level: "error"}
    }, function (err, _sails) {
      if (err) return done(err);
      sails = _sails;
      return done();
    });
  });

  it('should have a service', function (done) {
    assert.equal(sails.services['TemplateService'].helloWorld(), 'Hello World');
    done();
  });

  it('should have a form', function (done) {
    const type = sails.config['form']['forms']['template-1.0-draft']['type'];
    assert.equal(type, 'template');
    done();
  });

  it('should have a route', function (done) {
    supertest(sails.hooks.http.app)
      .get('/:branding/:portal/ws/template/hello')
      .expect(200)
      .end(function (err, res) {
        assert.equal(res.text, 'Hello World');
        done();
      });
  });

  // After tests are complete, lower Sails
  after(function (done) {

    // Lower Sails (if it successfully lifted)
    if (sails) {
      return sails.lower(done);
    }
    // Otherwise just return
    return done();
  });

  // Test that Sails can lift with the hook in place
  it('sails does not crash', function () {
    return true;
  });

});
