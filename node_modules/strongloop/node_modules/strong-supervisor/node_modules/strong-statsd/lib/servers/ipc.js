// Copyright IBM Corp. 2014,2015. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var cluster = require('cluster');
var debug = require('debug')('strong-statsd:ipc');
var events = require('events');
var util = require('util');

// Message format
//   .cmd: COMMAND
//   .metric: <statsd-encoded metric>
var COMMAND = 'strong-statsd:ipc:metric';

// 'server' that uses internal node/cluster IPC to get agent metrics
function IpcServer() {
}

util.inherits(IpcServer, events.EventEmitter);

IpcServer.prototype.start = function start(config, callback) {
  debug('starting');

  // Our own metrics go via a process event
  process.on(COMMAND, report);

  // Our children send their metrics via cluster messages
  cluster.on('fork', function(worker) {
    debug('watching worker %d', worker.id);

    worker.on('message', function metric(command) {
      if (command.cmd !== COMMAND)
        return;
      debug('worker %d reported %j', worker.id, command.metric);
      report(command.metric);
    });
  });


  // Callback expects BUFFER, RINFO compatible with dgram messages, so fake it.
  function report(metric) {
    var buf = Buffer(metric);
    callback(buf, rinfo(buf));
  }

  function rinfo(buf) {
    this.address = 'localhost';
    this.port = 0;
    this.family = 4;
    this.size = buf.length;
  }

  // Pretend we are async, since most servers are.
  process.nextTick(this.emit.bind(this, 'listening'));

  return this;
};

IpcServer.prototype.unref = function() {
};

IpcServer.prototype.close = function() {
  process.nextTick(this.emit.bind(this, 'close'));
};

IpcServer.prototype.address = function() {
  return 'internal-ipc';
};

IpcServer.prototype.sender = function(scope) {
  // Send to ourself or to our cluster master, as appropriate.
  if (cluster.isMaster) {
    return function publish(name, value) {
      // When sending to oneself, preserve asynchrony
      process.nextTick(function() {
        process.emit(COMMAND, encode(scope, name, value));
      });
    };
  } else {
    return function publish(name, value) {
      var msg = {cmd: COMMAND, metric: encode(scope, name, value)};
      debug('worker %d reporting %j', cluster.worker.id, msg.metric);
      process.send(msg);
    };
  }
};

// Report all metrics as 'gauge', unless last component of name indicates
// a more specific type.
var COUNTED = /\.count$/;
var TIMER = /\.timer$/;

function encode(scope, name, value) {
  scope = scope ? scope + '.' : '';

  if (COUNTED.test(name)) {
    return packet(scope, [
      [name, value, 'c']
    ]);
  } else if(TIMER.test(name)) {
    return packet(scope, [
      [name, value, 'ms']
    ]);
  } else {
    // Work around a well-known (if you read the right docs) statsd protocol
    // peculiarity. If a gauge value starts with a + or a -, it is accumulated
    // with last value. This is fine for positive numbers, but it means there is
    // no way to represent an absolute negative value, it will always be
    // interpreted as relative to the last value.
    if (value < 0) {
      return packet(scope, [
        [name, 0, 'g'],
        [name, value, 'g'],
      ]);
    }
    return packet(scope, [
      [name, value, 'g'],
    ]);
  }
};

function packet(scope, metrics) {
  var str = metrics.map(function(m) {
    return scope + m[0] + ':' + m[1] + '|' + m[2];
  }).join('\n');
  //var buf = new Buffer(str, 'utf8');
  return str;
};

module.exports = new IpcServer();
