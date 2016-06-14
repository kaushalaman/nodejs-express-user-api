// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: strong-start
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var debug = require('debug')('strong-start:pm');
var fmt = require('util').format;
var fs = require('fs');
var home = require('osenv').home;
var mkdirp = require('mkdirp').sync;
var net = require('net');
var once = require('lodash').once;
var path = require('path');
var retry = require('./retry');
var slpm = require.resolve('strong-pm/bin/sl-pm.js');
var spawn = require('child_process').spawn;

module.exports = Pm;

function Pm() {
  if (!(this instanceof Pm))
    return new Pm.apply(null, arguments);

  var _home = home();
  this.base = path.resolve(_home, '.strong-pm');
  this.logFile = path.resolve(this.base, 'start.log');
  this.url = 'http://127.0.0.1:8701';
}

Pm.prototype.start = function(callback) {
  var self = this;

  debug('start');

  self.isAlive(function(err) {
    if (!err) {
      debug('pm is alive');
      // Find the where the new log info will start at
      fs.stat(self.logFile, function(err, stat) {
        var logAt = err ? 0 : stat.size;
        return callback(null, logAt);
      });
      return;
    }
    debug('pm is missing: %s', err);
    self.spawn(callback);
  });
};

Pm.prototype.isAlive = function(_callback) {
  debug('isAlive...');

  var callback = once(function(err) {
    debug('alive? %s', err);
    return _callback(err);
  });

  var client = net.connect(8701)
    .once('error', callback)
    .once('connect', function() {
      client.destroy();
      callback();
    });
};

Pm.prototype.spawn = function(callback) {
  callback = once(callback);

  var self = this;
  var args = [
    slpm,
    '--base', this.base,
  ];

  mkdirp(this.base);

  try {
    fs.truncateSync(this.logFile, 0);
  } catch (er) {
    // Ignore, probably the file doesn't exist, and other errors
    // will be caught below when we open the file.
    debug('truncate failed: %s', er.message);
  }

  var logFd = fs.openSync(this.logFile, 'a');
  var options = {
    detached: true,
    stdio: ['ignore', logFd, logFd],
  };

  debug('spawn: %s args %j options %j', process.execPath, args, options);

  self.child = spawn(process.execPath, args, options)
    .once('error', function(err) {
      debug('spawn error: %s', err);
      callback(err);
    })
    .once('exit', function(status, signal) {
      var msg = fmt('pm failed, exit with status ', signal || status);
      return callback(Error(msg));
    });

  debug('wait for pm to be alive');

  retry(self.isAlive.bind(self), function(err) {
    debug('alive after start? %s', err);
    callback(err, 0);
  });
};
