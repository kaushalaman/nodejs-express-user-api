// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var Client = require('../');
var assert = require('assert');
var tap = require('tap');
var util = require('util');

tap.test('statsd internal', function(t) {
  t.plan(6);

  process.on('strong-statsd:ipc:metric', function(data) {
    var sawFoo = /APP.foo.count/.test(data);
    console.log('statsd done? %j <%s>', sawFoo, data);

    if (sawFoo) {
      client.stop(function() {
        console.log('statsd: closed');
        t.assert(sawFoo);
        t.end();
      });
    }
  });

  process.nextTick(statsdReady);

  var client = Client({
    silent: false,
    debug: true,
    scope: '%a',
    expandScope: expandScope,
    flushInterval: 2,
  });

  function expandScope(scope) {
    t.equal(scope, '%a');
    return 'APP';
  }

  function statsdReady() {
    client.backend('internal-statsd');
    client.start(onStart);
  }

  function onStart(er) {
    t.ifError(er);
    t.equal(client.server, null);
    t.assert(client.send('foo.count', 9));
    t.equal(client.url, 'internal-statsd:');
  }
});

process.on('exit', function(code) {
  console.log('EXIT', code);
});
