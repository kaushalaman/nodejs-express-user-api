// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var tap = require('tap');
var Statsd = require('../');

function checkUrl(url, port, host) {
  tap.test(url, function(t) {
    var server = Statsd();
    t.equal(server.backend(url), server, 'returns this');
    t.deepEqual(server.config.backends, ['./backends/repeater'], 'backend');
    t.deepEqual(server.config.repeater[0].host, host, 'host');
    t.deepEqual(server.config.repeater[0].port, port, 'port');
    return t.end()
    t.end();
  });
};

checkUrl('statsd', 8125, 'localhost');
checkUrl('statsd:', 8125, 'localhost');
checkUrl('statsd://', 8125, 'localhost');
checkUrl('statsd://example', 8125, 'example');
checkUrl('statsd://:7', 7, 'localhost');
checkUrl('statsd://example:7/', 7, 'example');
checkUrl('statsd://example:7', 7, 'example');
checkUrl('statsd:example', 8125, 'example');
checkUrl('statsd:example:7/', 7, 'example');
checkUrl('statsd:example:7', 7, 'example');

function failUrl(url, msg) {
  tap.test(url, function(t) {
    var server = Statsd();
    t.throws(function() {
      server.backend(url)
    }, {name: 'Error', message: msg});
    t.end();
  });
};

failUrl('statsd:///scope', 'statsd scope not supported');
failUrl('statsd://example/scope', 'statsd scope not supported');
failUrl('statsd://:7/scope', 'statsd scope not supported');
failUrl('statsd://example:7/scope', 'statsd scope not supported');
failUrl('statsd:/scope', 'statsd scope not supported');
failUrl('statsd:example/scope', 'statsd scope not supported');
failUrl('statsd:example:7/scope', 'statsd scope not supported');


process.on('exit', function(code) {
  if (code == 0) console.log('PASS');
});
