// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var assert = require('assert');

function InternalBackend(startupTime, config, emitter) {
  emitter.on('flush', function(timestamp, metrics) {
    var msg = {
      cmd: 'metrics',
      metrics: munge(timestamp, metrics),
    };

    config.internal.notify(msg.metrics);
  });

  return true; // Required to indicate success
}

// We'll strip the scope prefix, so the front-end doesn't see it, and can query
// metrics based on the app/host/id metadata without having to do its own
// parsing of the names.
//
// Match `app.host.(worker id).(metric)`, we discard app and host, because it
// could theoreticaly vary by metric (though that would likely be a bug), but we
// need the worker ID, and the metric name.
//
// This is here to guarantee the rx is compiled only once.
var SCOPERX = /[^.]+\.[^.]+\.([^.]+)\.(.*)/;

// stats provides timestamp to the backends in seconds since the epoc,
// presumably because that is the units common on unix, so best to provide to
// the backends. However, internal metrics go to javascript/loopback code, so we
// convert back to javascript convention, which is milliseconds since the epoc.
function munge(timestamp, metrics) {
  var processes = {};
  var batch = {
    processes: processes,
    timestamp: timestamp * 1000,
  };

  read('counters');
  read('timers');
  read('gauges');

  return batch;

  function read(type) {
    var all = metrics[type];
    for (var name in all) {
      read1(type, name, all[name]);
    }
  }

  function read1(type, name, value) {
    var rx = SCOPERX.exec(name);

    if (!rx) return; // statsd internal metrics have no scope

    var wid = rx[1];
    var name = rx[2];

    assert(wid.length, 'wid too short: ' + name);
    assert(name.length, 'name too short: ' + name);

    var p = processes[wid] || (processes[wid] = {
      counters: {}, timers: {}, gauges: {}
    });
    var t = p[type];

    t[name] = value;
  }
}

exports.init = InternalBackend;
exports.munge = munge; // Exposed for use by unit tests
