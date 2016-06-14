// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var internal = require('../lib/backends/internal');
var tap = require('tap');
var EE = require('events').EventEmitter;

tap.test('backend loads', function(t) {
  var ee = new EE;
  ee.on('newListener', function(event) {
    t.equal(event, 'flush');
    t.end();
  });
  t.equal(internal.init(Date.now(), {}, ee), true);
});

function munge(test, input, output) {
  tap.test(test + ' metrics munger', function(t) {
    // Backends get timestamp in seconds, but we expect metrics to have
    // timestamp in ms, as the js Date expects
    var timestamp = Math.round(new Date().getTime());
    var metrics = internal.munge(timestamp/1000, input);
    t.equal(metrics.timestamp, timestamp);
    t.deepEqual(metrics.processes, output);
    t.end();
  });
}

munge(
  'single',
  {
    counters: { 'app.host.0.a': 12, },
    timers: { 'app.host.0.t.c': 1.1, },
    gauges: { 'app.host.0.gggggg.hhhhh.llllll': -9.9, },
  },
  {
    '0': {
      counters: { 'a': 12, },
      timers: { 't.c': 1.1, },
      gauges: { 'gggggg.hhhhh.llllll': -9.9, },
    },
  }
);

munge(
  'empty',
  {
    counters: { },
    timers: { },
    gauges: { },
  },
  {
  }
);

munge(
  'partial',
  {
    timers: {'a.h.1.m': 0},
  },
  {
    '1': {
      counters: { },
      timers: { m: 0 },
      gauges: { },
    },
  }
);

munge(
  'multiple',
  {
    counters: { 'app.host.0.a': 12, },
    timers: { 'app.host.1.t.c': 1.1, },
    gauges: { 'app.host.2.gggggg.hhhhh.llllll': -9.9, },
  },
  {
    '0': {
      counters: { 'a': 12, },
      timers: { },
      gauges: { },
    },
    '1': {
      counters: { },
      timers: { 't.c': 1.1, },
      gauges: { },
    },
    '2': {
      counters: { },
      timers: { },
      gauges: { 'gggggg.hhhhh.llllll': -9.9, },
    },
  }
);

process.on('exit', function(code) {
  if (code == 0) console.log('PASS');
});
