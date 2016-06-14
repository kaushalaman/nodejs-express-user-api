// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var assert = require('assert');
var debug = require('debug')('strong-statsd:test');
var fmt = require('util').format;
var fs = require('fs');
var statsd = require('../');
var tap = require('tap');

tap.test('internal backend', function(t) {
  var scope = 'app.host.3';
  var server = statsd({
    // scope expansion is MANDATORY for internal use
    scope: scope,
    flushInterval: 2,
  });
  var startTime = Math.round(new Date().getTime()); // from statsd
  var pass;

  server.backend('internal');

  server.start(function(er) {
    var expectedUrl = 'internal-statsd:';
    t.ifError(er);
    t.equal(expectedUrl, server.url);
    t.assert(server.send('foo.count', -10));
    t.assert(server.send('foo.timer', 123));
    t.assert(server.send('foo.value', 4));
    setTimeout(function() {
      t.assert(server.send('foo.count', -9));
      t.assert(server.send('foo.timer', 7));
      t.assert(server.send('foo.value', 4.5));
    }, 200);
  });

  server.on('metrics', function(metrics) {
    debug('recv metrics: %j', metrics);
  });

  server.once('metrics', firstReport);

  var first;

  function firstReport(metrics) {
    first = metrics;
    t.assert(metrics.timestamp > startTime);
    t.deepEqual(Object.keys(metrics), ['processes', 'timestamp']);
    t.deepEqual(Object.keys(metrics.processes), ['3']);
    t.deepEqual(metrics.processes['3'], {
      counters: { 'foo.count': -19 }, // Note that counts are accumulated
      timers: { 'foo.timer': [7,123] }, // All timers are reported
      gauges: { 'foo.value': 4.5 }, // Only last gauge is reported
    });
    server.once('metrics', secondReport);
  }

  var second;

  // In second report, we see the values after the accumulators are reset and no
  // new values have been sent during the flush interval.
  function secondReport(metrics) {
    second = metrics;
    t.assert(metrics.timestamp > first.timestamp);
    t.deepEqual(Object.keys(metrics), ['processes', 'timestamp']);
    t.deepEqual(Object.keys(metrics.processes), ['3']);
    t.deepEqual(metrics.processes['3'], {
      counters: { 'foo.count': 0 },
      timers: { 'foo.timer': [] },
      gauges: { 'foo.value': 4.5 }, // For gauges, last value is preserved
    });

    t.assert(server.send('foo.count', -4));
    setTimeout(function() {
      t.assert(server.send('foo.count', 2));
    }, 200);
    t.assert(server.send('foo.timer', 5));
    t.assert(server.send('foo.value', -9));
    server.once('metrics', thirdReport);
  }

  function thirdReport(metrics) {
    t.assert(metrics.timestamp > second.timestamp);
    t.deepEqual(Object.keys(metrics), ['processes', 'timestamp']);
    t.deepEqual(Object.keys(metrics.processes), ['3']);
    t.deepEqual(metrics.processes['3'], {
      counters: { 'foo.count': -2 },
      timers: { 'foo.timer': [5] },
      gauges: { 'foo.value': -9 },
    });
    assert.equal(metrics.processes['3'].counters['foo.count'], -2);

    server.stop(onStop);
    pass = true;
  }

  function onStop() {
    t.assert(pass);
    t.end();
  }
});

process.on('exit', function(code) {
  if (code == 0) console.log('EXIT');
});
