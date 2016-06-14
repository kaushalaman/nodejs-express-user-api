// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var assert = require('assert');
var Server = require('./../lib/server');

// Server is unrefed, keep test alive until it has passed.
var keepAlive = setInterval(function(){}, 1000);

process.on('exit', function(code) {
  console.log('EXIT:', code);
});

var server = new Server;

assert(server.start);

var config = {
  port: 0,
};

server.start(config, log, started);

function log() {
}

function started(err, server) {
  assert.ifError(err);
  console.log('server started: %j', server.address());
  clearInterval(keepAlive);
}
