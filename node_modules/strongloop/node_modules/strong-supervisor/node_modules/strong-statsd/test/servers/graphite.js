// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var EE = require('events').EventEmitter;
var net = require('net');
var util = require('util');

module.exports = Graphite;

function Graphite(callback) {
  var self = new EE;
  var server = net.createServer(onConnect).listen(0);

  function onConnect(sock) {
    sock.on('data', function(data) {
      self.emit('data', String(data));
    });
  }

  server.on('listening', function() {
    self.url = util.format('graphite:localhost:%d', this.address().port);
    self.emit('listening');
  });

  server.on('error', function(er) {
    self.emit('error', er);
  });

  self.close = function(callback) {
    server.once('close', function() {
      self.emit('close');
    });
    if (callback) self.once('close', callback);
    server.close();
  };

  self.unref = function() {
    server.unref();
  };

  return self;
}
