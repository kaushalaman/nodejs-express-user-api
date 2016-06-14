// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var assert = require('assert');
var Client = require('../');
var cluster = require('cluster');
var util = require('util');

var reported = [];
var expected = [];
var ok;

process.on('exit', function(code) {
  assert(ok, 'test not ok');
  console.log('EXIT:', code);
});

process.on('strong-statsd:ipc:metric', function(data) {
  console.log('reported: %s', data);
  reported.push(data.toString());

  checkIfPassed();
});

var client = Client({
  flushInterval: 2,
});

function publish(name, value) {
  client.send(name, value);
}

client.backend('internal-statsd');
client.start(test);

function test() {
  console.log('start test');

  function write(name, value, type) {
    var zero = '';
    if (value < 0 && type === 'g') {
      // Expect the negative-gauge workaround.
      zero = util.format('%s:%d|%s\n', name, 0, type);
    }
    expected.push(zero + util.format('%s:%d|%s', name, value, type));
    publish(name, value);
  }

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
}

function checkIfPassed() {
  if (reported.length < expected.length) {
    console.log('%d < %d, waiting for more reports...',
      reported.length, expected.length);
    return;
  }
  console.log('reported:', reported);
  console.log('expected:', expected);
  assert.equal(reported.length, expected.length);
  for (var i = 0; i < reported.length; i++) {
    assert.deepEqual(reported[i], expected[i], 'at idx ' + i);
  }

  ok = true;

  console.log('PASS');
}
