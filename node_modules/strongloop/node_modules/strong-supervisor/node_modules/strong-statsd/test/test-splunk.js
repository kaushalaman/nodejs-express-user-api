// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var Splunk = require('./servers/splunk');
var assert = require('assert');
var statsd = require('../');
var tap = require('tap');
var util = require('util');

function checkUrl(url, port, host) {
  tap.test(url, function(t) {
    var server = statsd();
    t.equal(server.backend(url), server, 'returns this');
    t.deepEqual(server.config.backends, ['./backends/splunk'], 'backend');
    t.deepEqual(server.config.udpkv.port, port, 'port');
    t.deepEqual(server.config.udpkv.host, host, 'host');
    t.end();
  });
};

checkUrl('splunk://:7', 7, 'localhost');
checkUrl('splunk://example:7', 7, 'example');
checkUrl('splunk:example:7', 7, 'example');

tap.test('splunk invalid host', function(t) {
  var server = statsd({silent: false, debug: true, flushInterval: 2});
  server.backend('splunk://name.does.not.exist:12345');
  server.start(onStart);

  var rx = RegExp(
    'Failed to load backend: splunk.*' +
    'lookup.*name.does.not.exist.*getaddrinfo.*'
  );
  function onStart(er) {
    t.assert(rx.test(er.message));
    t.end();
  }
});

tap.test('port missing', function(t) {
  var server = statsd();
  try {
    server.backend('splunk://example');
  } catch(er) {
    t.equal(er.message, 'splunk port missing');
    t.end();
  }
});

tap.test('splunk output', function(t) {
  var splunk = Splunk();

  splunk.on('data', function(data) {
    var sawFoo = /stat=foo/.test(data);
    console.log('splunk done? %j <%s>', sawFoo, data);

    if (sawFoo) {
      splunk.close();
      server.stop(function() {
        console.log('statsd: closed');
        t.end();
      });
    }
  });

  splunk.on('listening', splunkReady);

  var server = statsd({silent: false, debug: true, flushInterval: 2});

  function splunkReady() {
    server.backend(splunk.url);
    server.start(onStart);
  }

  function onStart(er) {
    t.ifError(er);
    t.assert(server.send('foo.count', 9));
  }
});

process.on('exit', function(code) {
  console.log('EXIT', code);
});
