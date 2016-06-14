// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var Syslog = require('./servers/syslog');
var assert = require('assert');
var statsd = require('../');
var tap = require('tap');

try {
  var nodeSyslog = require('modern-syslog');
} catch (e) {
  tap.test('missing syslog support', function(t) {
    t.throws(function(){
      var server = statsd();
      server.backend('syslog');
    });
    t.end();
  });
  return;
}

function checkUrl(url, application, priority) {
  tap.test(url, function(t) {
    var server = statsd({syslog: nodeSyslog});
    t.equal(server.backend(url), server, 'returns this');
    t.deepEqual(server.config.backends[0], './backends/syslog', 'backend');
    t.deepEqual(server.config.syslog.application, application, 'application');
    t.deepEqual(server.config.syslog.priority, priority, 'priority');
    t.end();
  });
};

checkUrl('syslog', 'statsd', 'LOG_INFO');
checkUrl('syslog:', 'statsd', 'LOG_INFO');
checkUrl('syslog:?', 'statsd', 'LOG_INFO');
checkUrl('syslog:?application=app', 'app', 'LOG_INFO');
checkUrl('syslog:?priority=LOG_WARNING', 'statsd', 'LOG_WARNING');
checkUrl('syslog:?application=X&priority=LOG_WARNING', 'X', 'LOG_WARNING');
checkUrl('syslog:?application=&priority=', 'statsd', 'LOG_INFO');

tap.test('priority invalid', function(t) {
  var server = statsd({syslog: nodeSyslog});
  try {
    server.backend('syslog:?priority=LOG_WARN');
  } catch(er) {
    t.equal(er.message, 'syslog priority invalid');
    t.end();
  }
});

tap.test('syslog not supported', function(t) {
  var server = statsd();
  try {
    server.backend('syslog:');
  } catch(er) {
    t.equal(er.message, 'syslog not supported');
    t.end();
  }
});

tap.test('syslog output', function(t) {
  var syslog = Syslog(nodeSyslog);
  var server = statsd({syslog: nodeSyslog, flushInterval: 2});
  server.backend('syslog');

  t.plan(7);

  syslog.on('init', function(args) {
    console.log('init:', args);
    t.equal(args.application, 'statsd', 'args'); // XXX(sam) strong-agent?
    t.equal(args.options, nodeSyslog.LOG_PID | nodeSyslog.LOG_ODELAY, 'args');
    t.equal(args.facility, nodeSyslog.LOG_LOCAL0, 'args');
  });

  syslog.on('log', function(args) {
    console.log('log:', args);
    if (!/foo.count/.test(args.message))
      return; // skip statsd internal counts
    t.equal(args.priority, nodeSyslog.LOG_INFO);
    t.equal(args.message, 'foo.count=19 (count)');
    server.stop();
  });

  server.start(function(er) {
    console.log('start:', er);
    t.ifError(er);
    t.assert(server.send('foo.count', 19));
  });
});

process.on('exit', function(code) {
  console.log('EXIT:', code);
});
