// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var assert = require('assert');
var statsd = require('../');
var tap = require('tap');

function checkUrl(url, color) {
  tap.test(url, function(t) {
    var server = statsd();
    t.equal(server.backend(url), server, 'returns this');
    t.deepEqual(server.config.backends, ['./backends/console'], 'backend');
    t.deepEqual(server.config.console, {prettyprint: color}, 'config');
    t.end();
  });
};

checkUrl('debug', false);
checkUrl('debug:', false);
checkUrl('debug:?', false);
checkUrl('debug:?pretty', true);
checkUrl('debug:?pretty=true', true);
checkUrl('debug:?pretty=anything', true);
checkUrl('debug:?pretty=false', false);

tap.test('debug output', function(t) {
  var server = statsd({silent: true, flushInterval: 2});
  server.backend('debug');

  server.start(function(er) {
    t.ifError(er);
    t.assert(/^internal-statsd:$/.test(server.url), server.url);
  });

  var flushingStats;
  var jsonSeen;
  if (server.child.stdout) {
    server.child.stdout.on('data', function(line) {
      flushingStats = flushingStats || /stats=/.test(line);
      jsonSeen = jsonSeen || /"counters":/.test(line);
      console.log('line<%s> %j %j', line, flushingStats, jsonSeen);

      if (flushingStats && jsonSeen)
        server.stop(onStop);
    });
  }

  function onStop() {
    t.assert(flushingStats, 'flushing stats');
    t.assert(jsonSeen, 'flushing counter json');
    t.end();
  }
});

process.on('exit', function(code) {
  if (code == 0) console.log('PASS');
});
