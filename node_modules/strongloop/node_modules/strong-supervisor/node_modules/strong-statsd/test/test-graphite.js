// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var Graphite = require('./servers/graphite');
var assert = require('assert');
var statsd = require('../');
var tap = require('tap');

function checkUrl(url, port, host) {
  tap.test(url, function(t) {
    var server = statsd();
    t.equal(server.backend(url), server, 'returns this');
    t.deepEqual(server.config.backends, ['./backends/graphite'], 'backend');
    t.deepEqual(server.config.graphitePort, port, 'port');
    t.deepEqual(server.config.graphiteHost, host, 'host');
    t.deepEqual(server.config.graphite.legacyNamespace, false, 'legacy');
    t.end();
  });
};

checkUrl('graphite', 2003, 'localhost');
checkUrl('graphite:', 2003, 'localhost');
checkUrl('graphite://', 2003, 'localhost');
checkUrl('graphite://example', 2003, 'example');
checkUrl('graphite://example:7', 7, 'example');
checkUrl('graphite://example:', 2003, 'example');
checkUrl('graphite:example', 2003, 'example');
checkUrl('graphite:example:7', 7, 'example');
checkUrl('graphite:example:', 2003, 'example');


tap.test('graphite output', function(t) {
  var graphite = Graphite();

  graphite.on('data', function(data) {
    var sawFoo = /stats.counters.a.b.foo/.test(data);
    console.log('graphite done? %j <\n%s>', sawFoo, data);

    if (sawFoo) {
      graphite.close(function() { console.log('graphite: closed'); });
      server.stop(function() { console.log('statsd: closed'); });
      t.end();
    }
  });

  graphite.on('listening', function() {
    server.backend(graphite.url);
    server.start(onStart);
  });

  var server = statsd({
    scope: 'a.b',
    silent: false,
    debug: true,
    flushInterval: 2,
  });

  function onStart(er) {
    t.ifError(er);
    t.assert(server.send('foo.count', 19));
  }
});

process.on('exit', function(code) {
  console.log('EXIT', code);
});
