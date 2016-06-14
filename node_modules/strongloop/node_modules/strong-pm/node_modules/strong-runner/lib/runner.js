// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: strong-runner
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var EventEmitter = require('events').EventEmitter;
var Stdio = require('./stdio');
var _ = require('lodash');
var assert = require('assert');
var c2s = require('./runnable').toString;
var childctl = require('strong-control-channel/process');
var debug = require('debug')('strong-runner:runner');
var debugIo = require('debug')('strong-runner:io').enabled;
var fs = require('fs');
var path = require('path');
var util = require('util');

module.exports = exports = Runner;

// Extend base without modifying it.
function extend(base, extra) {
  return util._extend(util._extend({}, base), extra);
}

function Runner(commit, options) {
  if (!(this instanceof Runner))
    return new Runner(commit, options);

  EventEmitter.call(this);

  this.options = options = util._extend({
    console: console,
    start: 'sl-run --cluster=cpu --profile',
    quiet: false,
  }, options);
  this.console = options.console;
  this.commit = commit;
  this.child = null;
  this.status = null;
  this.nextCommit = null;
  this.stopped = null;
  this.PWD = null;
  this.restartCount = 0; // XXX(sam) use event, and handle external to runner?
  this.stdout = Stdio('stdout', options.quiet);
  this.stderr = Stdio('stderr', options.quiet);

  if (options.request)
    this.request = options.request;
}

util.inherits(Runner, EventEmitter);

Runner.prototype.start = function start() {
  this.console.log('Start %s', this);

  if (this.child) return null;

  this.stopped = false;

  var commit = this.commit;
  var cmd = this.options.start;

  assert(cmd && cmd.length);

  var PWD = commit.dir;
  if (!commit.runInPlace) {
    // Set PWD in env to the working directory (as shell does).
    PWD = path.resolve(commit.dir, '..', 'current');
  }

  commit.env.PWD = PWD;
  this.PWD = PWD;

  if (!commit.runInPlace) this._linkPwd();

  debug('start with command `%s` env %j', cmd, commit.env);

  // XXX(sam) This is fragile, should use a shell parser, like cicada does.
  var args = cmd.split(/\s+/); // tokenize into args array

  if (args[0] === 'sl-run')
    args[0] = require.resolve('strong-supervisor/bin/sl-run');

  debug('spawn: %s %j', process.execPath, args);

  this.child = commit.spawn(process.execPath, args, {
    // cwd: commit.spawn sets this to working directory for commit
    env: extend(process.env, commit.env),
    stdio: [0, debugIo ? 1 : 'pipe', debugIo ? 2 : 'pipe', 'ipc'],
  });

  if (this.child.stdout)
    this.child.stdout.pipe(this.stdout, {end: false});
  if (this.child.stderr)
    this.child.stderr.pipe(this.stderr, {end: false});

  if (!this.options.request)
    this.ctl = childctl.attach(this.onRequest.bind(this), this.child);

  this.child.runner = this;
  this.child.on('error', function(err) {
    this.console.error('Fail to spawn `%s` in `%s`: %s', cmd, commit.dir, err);
    // Mostly, this will fail because cmd wasn't found in PATH, but it could
    // also fail because of insufficient mem, permissions, etc. Pass failure
    // up by faking a 127 exit status for this, similar to /bin/sh.
    this.runner.onExit(127);
  });

  this.child.on('exit', this.onExit.bind(this));

  process.nextTick(_.bind(this.emit, this, 'start'));

  return this;
};

Runner.prototype.onRequest = function onRequest(req, callback) {
  debug('receive request %j by %s', req, this);
  this.emit('request', req, callback);
};

Runner.prototype.request = function request(req, callback) {
  this.console.log('Request %j of %s', req, this);
  return this.ctl.request(req, callback);
};

Runner.prototype._linkPwd = function _linkPwd() {
  assert(this.PWD);

  // Symlink will fail if the link already exists, so remove last link.
  try {
    fs.unlinkSync(this.PWD);
  } catch (er) {
    // File didn't exist.
  }
  // Always symlink to an absolute path, relative paths don't work on win32.
  debug('link %s to %s', this.PWD, this.commit.dir);
  fs.symlinkSync(this.commit.dir, this.PWD, 'junction');
};

Runner.prototype.onExit = function onExit(code, signal) {
  var status = signal || code;

  debug('Exit of %s with status %s stopped? %s', this, status, this.stopped);

  this.child = null;
  this.emit('exit', status);
  this._restart(status);
};

// Callback with exit status if killed, with nothing if already dead.
Runner.prototype.kill = function kill(callback) {
  if (!callback) {
    callback = function() {};
  }

  if (!this.child) {
    process.nextTick(callback);
    return this;
  }

  var signame = 'SIGTERM';

  debug('Kill process %s with %s', this.child.pid, signame);

  try {
    this.child.kill(signame);
    this.child.once('exit', function(code, signal) {
      callback(signal || code);
    });
  } catch (err) {
    if (err.code === 'ESRCH') {
      // We got unlucky, the process is dead
      process.nextTick(callback);
      return;
    }
    this.console.error('Kill process %d with %s failed: %s',
      this.child.pid, signame, err);
  }
  return this;
};

Runner.prototype.stop = function stop(callback) {
  this.console.log('Stop %s', this);

  var self = this;
  self.stopped = true;
  self.kill(function(status) {
    if (callback) callback(status);
  });
  return this;
};

Runner.prototype.softStop = function softStop(callback) {
  this.console.log('Soft stop %s', this);

  var self = this;

  if (!self.child) {
    process.nextTick(callback);
    return this;
  }

  self.stopped = true;
  self.request({cmd: 'stop'}, function(rsp) {
    debug('stop response: %j', rsp);
  });

  var to = setTimeout(function() {
    self.console.log('Soft stop %s: forcibly terminate', this);
    self.kill();
  }, 5000);
  self.once('exit', function(status) {
    clearTimeout(to);
    return callback(status);
  });
  return this;
};

Runner.prototype.toString = function toString() {
  var s = 'Runner:';

  if (this.child) {
    s += util.format(' child %s', this.child.pid);
  }
  if (this.stopped) {
    s += ' (stopped)';
  }
  if (this.commit) {
    s += util.format(' commit %s', c2s(this.commit));
  }
  if (this.nextCommit) {
    s += util.format(' next %s', c2s(this.nextCommit));
  }
  return s;
};

// Replace currently running commit with next commit.
Runner.prototype.replace = function replace(next) {
  if (envChanged(this.commit.env, next.env)) {
    this.console.log('ENV has changed, restarting');
    this.nextCommit = next;
    this.kill();
    return this;
  }

  this.commit = next;

  // In the case of runInPlace commits, there is no `current` directory
  if (!this.commit.runInPlace) this._linkPwd();

  if (!this.child) {
    // Current app is not running, so just start again with the current commit.
    return this.start();
  }
  this.request({cmd: 'restart'}, function(rsp) {
    // On failure, the ctl channel has been lost, so the child is already
    // dead, or in process of dieing, and we don't have to handle this.
    if (rsp.error)
      debug('restart command to %d failed: %s', this.child.pid, rsp.error);
  });

  return this;
};

function envChanged(a, b) {
  return !_.isEqual(
    _.omit(a, 'PATH', 'PWD', 'CWD'),
    _.omit(b, 'PATH', 'PWD', 'CWD')
  );
}

Runner.prototype._restart = function _restart(status) {
  debug('_restart %s', this);

  if (this.stopped) return;

  if (this.nextCommit) {
    this.commit = this.nextCommit;
    this.nextCommit = null;
    this.console.log('Restarting next commit %s', this);
    this.restartCount = 0;
    this.start();
    return;
  }

  // The runner should not exit unless we stopped it so a next version of the
  // app could be run, something has gone wrong!
  this.console.log('Unexpected exit with %s from %s', status, this);
  this.restartCount += 1;

  // Throttle the restart
  // XXX(sam) this is pretty awful... actually, if the master faults, you
  // probably want to restart immediately. Think about it some more. And a
  // 1-second throttle isn't much, anyhow!
  setTimeout(this.start.bind(this), 1000);
};
