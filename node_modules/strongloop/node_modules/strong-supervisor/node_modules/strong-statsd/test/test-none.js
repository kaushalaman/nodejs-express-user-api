// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var assert = require('assert');
var Statsd = require('../');
var statsd = new Statsd();
var tap = require('tap');

tap.test('fail with no backends', function(t) {
    t.plan(2);
    statsd.start(function(er) {
      t.assert(er);
      t.equal(er.message, 'start failed: no backends configured');
    });
});

process.on('exit', function(code) {
  console.log('EXIT:', code);
});
