// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: strong-runner
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var EventEmitter = require('events').EventEmitter;
var Runner = require('./runner');
var Stdio = require('./stdio');
var assert = require('assert');
var c2s = require('./runnable').toString;
var util = require('util');

module.exports = App;

function App(options) {
  if (!(this instanceof App))
    return new App(options);

  EventEmitter.call(this);

  this.options = options = util._extend({
    console: console,
    quiet: true, // Avoid both Runner and App sending stdio to debug().
    // XXX(sam) for multi-app, may also need:
    //   name: app name
  }, options);
  this.console = options.console;
  this.current = null;
  this.stdout = Stdio('stdout');
  this.stderr = Stdio('stderr');
}

util.inherits(App, EventEmitter);

// Run a commit, replacing the currently running commit, if it exists.
App.prototype.run = function run(commit) {
  var self = this;
  var current = self.current;

  self.console.log('Run request for commit %j on current %s',
    c2s(commit), c2s(current));

  if (current) {
    current.replace(commit);
    return current;
  }

  current = self.current = new Runner(commit, self.options);

  self.start(function(err) {
    assert.ifError(err);
  });

  current.on('request', function(req, callback) {
    self.emit('request', req, callback);
  });

  return current;
};

// Start the current commit, if it exists.
//
// Note that callback occurs when start has commenced... not when the app is
// known to be 'started'.
App.prototype.start = function(callback) {
  var current = this.current;

  if (!current) {
    return callback(new Error('no current application'));
  }

  if (!current.start()) {
    return callback(new Error('application running, so cannot be started'));
  }

  current.stdout.pipe(this.stdout, {end: false});
  current.stderr.pipe(this.stderr, {end: false});

  return callback();
};

// Stop the current commit, if it exists.
//
// style must be 'hard' or 'soft', and is mandatory.
App.prototype.stop = function(style, callback) {
  var self = this;
  var current = self.current;

  self.console.log('Stop (%s) current %s', style, current || '(none)');

  if (!callback)
    callback = function() {};

  if (!current) {
    process.nextTick(function() {
      return callback(new Error('no current application to stop'));
    });
    return null;
  }

  var method = {soft: current.softStop, hard: current.stop}[style];

  assert(method, 'app.stop() style invalid');

  method.call(current, function(status) {
    // FIXME verify this is safe at this time... it might be that we should wait
    // for child 'close', not exit, before unpiping. Actually, all the piping
    // may cause memory leaks, go through it all carefully to ensure cleanup.
    current.stdout.unpipe(self.stdout);
    current.stderr.unpipe(self.stderr);

    return callback(null, status);
  });
};

App.prototype.request = function(req, callback) {
  var current = this.current && this.current.child && this.current;

  if (current)
    this.console.log('Request (%s) of current %s', req.cmd, current);

  if (!current)
    return callback(new Error('no current application'));

  this.current.request(req, callback);
};
