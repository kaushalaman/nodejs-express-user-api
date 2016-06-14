// Copyright IBM Corp. 2014,2015. All Rights Reserved.
// Node module: strong-wait-till-listening
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var assert = require('assert');
var debug = require('debug')('strong-wait-till-listening');
var extend = require('util')._extend;
var net = require('net');

module.exports = function waitTillListening(options, cb) {
  options = extend(
    {
      host: 'localhost',
      pollingIntervalInMs: 50
    },
    options
  );

  assert(options.port, 'options.port is required');
  assert(options.timeoutInMs > 0,
    'options.timeoutInMs must be a positive number');

  var finished = false;
  var client;

  var timeouts = [];
  var callback = function() {
    timeouts.forEach(clearTimeout);
    timeouts = [];
    cb.apply(this, arguments);
  };
  timeouts.push(setTimeout(failWithTimeout, options.timeoutInMs));

  tryConnect();

  function tryConnect() {
    if (finished) return;
    debug('Trying to connect to %s:%s', options.host, options.port);

    client = net.connect({
      host: options.host,
      port: options.port
    });

    client.on('connect', function() {
      // Always close the client connection,
      // even if we already called the callback.
      client.end();

      if (finished) return;
      finished = true;

      debug('Connected.');
      callback();
    });

    client.on('error', function(err) {
      if (finished) return;

      debug('Connection failed, retrying in %sms. %s',
        options.pollingIntervalInMs, err);

      timeouts.push(setTimeout(tryConnect, options.pollingIntervalInMs));
    });
  }

  function failWithTimeout() {
    if (finished) return;
    finished = true;

    // Destroy any pending connection. We no longer care about the result.
    if (client) client.destroy();

    var msg = 'Timed out while waiting for a server listening on ' +
      options.host + ':' + options.port;
    debug(msg);
    callback(new Error(msg));
  }
};
