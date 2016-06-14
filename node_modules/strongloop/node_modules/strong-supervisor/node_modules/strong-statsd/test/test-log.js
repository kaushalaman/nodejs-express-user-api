// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var assert = require('assert');
var fs = require('fs');
var statsd = require('../');
var tap = require('tap');

var LOG = './backends/log';

function checkUrl(url, file) {
  tap.test(url, function(t) {
    var server = statsd();
    t.equal(server.backend(url), server, 'returns this');
    t.deepEqual(server.config.backends, [LOG], 'backend');
    delete server.config.log.stdout;
    t.deepEqual(server.config.log, {file: file}, 'file');
    t.end();
  });
};

checkUrl('log', '-');
checkUrl('log:', '-');
checkUrl('log:-', '-');
checkUrl('log:file.log', 'file.log');
checkUrl('log:/file.log', '/file.log');
checkUrl('log:/some/file.log', '/some/file.log');
checkUrl('log:../file.log', '../file.log');

tap.test('log output to invalid file', function(t) {
  var server = statsd({silent: false});

  server.backend('log:/no/such/path/will/exist');

  var expect = RegExp(
    'Failed to load backend: log (.*' +
    'no such file or directory.*' +
    '/no/such/path/will/exist.*)');

  server.start(function(er) {
    console.log('expected error:', er);
    t.assert(er instanceof Error);
    t.assert(expect.test(String(er)));
    t.end();
  });
});

tap.test('log output to file', function(t) {
  var server = statsd({silent: false, flushInterval: 2});

  server.backend('log:_.log');

  server.start(function(er) {
    t.ifError(er);
    t.assert(/^internal-statsd:$/.test(server.url), server.url);
    t.assert(server.send('foo.count', -19));
    t.assert(server.send('foo.timer', 123));
    t.assert(server.send('foo.value', 4.5));
  });

  var seen = 0;
  var log;
  var poll = setInterval(function() {
    var last = log;
    log = fs.readFileSync('_.log', {encoding: 'utf-8'});

    if (log === last) return;

    if (/foo.count=-19 .count./.test(log)) seen++;
    if (/foo.timer=123 .ms./.test(log)) seen++;
    if (/foo.value=4.5 .gauge./.test(log)) seen++;

    console.log('log<%s> seen=%d', log, seen);

    if (seen >= 3) {
      clearInterval(poll);
      server.stop(onStop);
    }
  }, 5 * 1000);

  function onStop() {
    t.assert(seen >= 3);
    t.end();
  }
});

tap.test('log output to stdout', function(t) {
  var server = statsd({silent: true, flushInterval: 2});

  server.backend('log');

  server.start(function(er) {
    t.ifError(er);
    t.assert(/^internal-statsd:/.test(server.url), server.url);
    t.assert(server.send('foo.count', -19));
    t.assert(server.send('foo.timer', 123));
    t.assert(server.send('foo.value', 4.5));
  });

  var seen = 0;
  if (server.child.stdout) {
    server.child.stdout.on('data', function(line) {
      if (/foo.count=-19 .count./.test(line)) seen++;
      if (/foo.timer=123 .ms./.test(line)) seen++;
      if (/foo.value=4.5 .gauge./.test(line)) seen++;

      console.log('line<%s> seen=%d', line, seen);

      if (seen >= 3)
        server.stop(onStop);
    });
  }

  function onStop() {
    t.assert(seen >= 3);
    t.end();
  }
});

process.on('exit', function(code) {
  console.log('EXIT', code);
});
