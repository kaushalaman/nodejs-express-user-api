// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var assert = require('assert');
var Client = require('../');
var cluster = require('cluster');
var util = require('util');

if (cluster.isMaster) {
  var reported;
  var expected;
  var ok;

  process.on('exit', function(code) {
    assert(ok, 'test not ok');
    console.log('EXIT:', code);
  });

  var client = Client({
    flushInterval: 1,
  });

  client.on('metrics', function(metrics) {
    if (reported) return;
    console.log('reported:', metrics);
    reported = metrics;
    checkIfPassed();
  });

  client.backend('internal');
  client.start(fork);

  function fork() {
    assert.equal(client.url, 'internal-statsd:');
    console.log('forking worker');
    cluster.fork()
      .on('disconnect', function() {
        console.log('disconnected');
      })
      .on('message', function(message) {
        if (message.expected) {
          expected = message.expected;
        }
      });
  }

  function checkIfPassed() {
    if (reported.processes[1])
      reported = reported.processes[1];

    console.log('reported:', util.inspect(reported, {depth: null}));
    console.log('expected:', expected);
    assert.deepEqual(reported.gauges, expected.g);
    assert.deepEqual(reported.timers, expected.ms);
    assert.deepEqual(reported.counters, expected.c);
    ok = true;
    cluster.disconnect();
  }

  return;
}

var client = Client({
  scope: 'hostname.appname.1',
});

client.backend('internal-statsd');
client.start(test);

function publish(name, value) {
  client.send(name, value);
}

var expected = { g: {}, c: {}, ms: {}};

function write(name, value, type) {
  switch(type) {
    case 'ms': expected[type][name] = [value]; break;
    case 'c': expected[type][name] = (expected[type][name] || 0) + value; break;
    default: expected[type][name] = value; break;
  }
  publish(name, value);
}

function test() {
  console.log('start test');

  // count are counts, timers are timers, and stats that don't END in count or
  // timer are gauges
  write('loop.count', 100, 'c');
  write('loop.something', 5.99, 'g');
  write('loop.count', 50, 'c');
  write('loop.timer', 50, 'ms');
  write('object.String.count', -10, 'c');
  write('object.String.size', -1029, 'g');
  write('loop.count.x', 150, 'g');
  write('loop.timer.y', 150, 'g');
  process.send({expected: expected});
}
