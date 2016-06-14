// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var EventEmitter = require('events').EventEmitter;
var Log = require('./lib/log');
var Server = require('./lib/server');
var assert = require('assert');
var debug = require('debug')('strong-statsd');
var fmt = require('util').format;
var fork = require('child_process').fork;
var fs = require('fs');
var ipc = require('./lib/servers/ipc');
var parse = require('url').parse;
var path = require('path');
var util = require('util');

// Config template:
// {
//   // Start listening for statsd/udp on ephemeral port
//   port: 0,
// 
//   // Graphite configuration
//   backends: [ "./backends/graphite" ],
//   graphitePort: 2003,
//   graphiteHost: "localhost",
//   graphite: { legacyNamespace: false, },
// 
//   // Syslog configuration (should be a backend, but it isn't)
//   dumpMessages: true,
//   log: { backend: 'syslog', level: 'LOG_WARNING' },
// 
//   // Console configuration, useful for testing
//   backends: [ "./backends/console" ],
//   console: { prettyprint: true },
//
//   // splunk configuration:
//   //  https://github.com/dylanmei/statsd-udpkv-backend#configuration
// }

function Statsd(options) {
  if (!(this instanceof Statsd))
      return new Statsd(options);

  EventEmitter.call(this);

  options = util._extend({}, options);
  this.forwardMetrics = null;
  this.debug = !!options.debug;
  this.expandScope = options.expandScope;
  this.scope = options.scope || '';
  this.configFile = path.resolve('.statsd.json');
  this.flushInterval = (options.flushInterval || 15) * 1000;
  this.syslog = options.syslog; // node-syslog dependency must be provided
  this.config = {
    debug: this.debug,
    flushInterval: this.flushInterval,
    dumpMessages: this.debug,
    backends: [],
  };
  this._send = null;
  this.server = null;

  // XXX child.stdout/err structure for bacwards compat
  this.child = {
    stdout: new Log('stdout'),
    stderr: new Log('stderr'), // FIXME unused?
  };
  this.logger = {
    log: this.child.stdout.log.bind(this.child.stdout),
  };

}

util.inherits(Statsd, EventEmitter);

// XXX(sam) would be better to return a fully expanded URL (with all the
// defaults written in) then to return self
Statsd.prototype.backend = function backend(url) {
  var backend;
  var config = {};
  var _ = parse(url, true);
  if (!_.protocol) {
    // bare word, such as 'console', or 'statsd'
    _.protocol = url + ':';
    // bare word also shows up in path & pathname, clear it
    _.pathname = '';
    _.path = '';
  }

  switch (_.protocol) {
    case 'statsd:': {
      if (_.path && _.path !== '/')
        die('statsd scope not supported');
      backend = "./backends/repeater";
      config = {
        repeater: [{
          host: _.hostname || 'localhost',
          port: _.port || 8125,
        }]
      };
      break;
    }
    case 'debug:': {
      backend = "./backends/console";
      config = {
        console: {
          prettyprint: 'pretty' in _.query && _.query.pretty !== 'false'
        }
      };
      break;
    }
    case 'log:': {
      backend = './backends/log';
      config = {
        log: {
          file: (_.hostname || '') + (_.pathname || ''),
          stdout: this.child.stdout,
        }
      };
      config.log.file = config.log.file || '-';
      break;
    }
    case 'graphite:': {
      backend = "./backends/graphite";
      config = {
        graphitePort: _.port || 2003, // graphite default
        graphiteHost: _.hostname || 'localhost',
        graphite: {
          legacyNamespace: false
        }
      };
      break;
    }
    case 'splunk:': {
      if (!_.port) {
        return die('splunk port missing');
      }
      backend = "./backends/splunk";
      config = {
        udpkv: {
          host: _.hostname || 'localhost',
          port: _.port,
        },
      };
      break;
    }
    case 'syslog:': {
      if (!this.syslog) {
        return die('syslog not supported');
      }
      var priority = _.query.priority || 'LOG_INFO';
      if (priority) {
        // Must be valid, or syslog will abort.
        if (!/^LOG_/.test(priority) || !(priority in this.syslog)) {
          return die('syslog priority invalid');
        }
      }
      backend = './backends/syslog';
      config = {
        syslog: {
          application: _.query.application || 'statsd',
          priority: priority,
          syslog: this.syslog,
        }
      };
      break;
    }
    case 'internal:': {
      backend = './backends/internal';
      config = {
        internal: {
          notify: this.emit.bind(this, 'metrics'),
        },
      };
      break;
    }
    case 'internal-statsd:': {
      this.forwardMetrics = true;
      break;
    }
    default:
      return die('url format unknown');
  }

  if (this.forwardMetrics && this.config.backends.length) {
    die('misconfigured, cannot be internal and have a backend');
  }

  if (backend) {
    if (this.config.backends.indexOf(backend) > -1) {
      throw Error(fmt('%s metrics already configured', _.protocol));
    }
    this.config.backends.push(backend);
  }

  this.config = util._extend(this.config, config);

  function die(error) {
    var er = Error(error);
    er.url = url;
    throw er;
  }

  return this;
};

Statsd.prototype.start = function start(callback) {
  var self = this;
  var scope = this.scope;
  scope = this.expandScope ? this.expandScope(scope) : scope;

  if (this.forwardMetrics) {
    self._send = ipc.sender(scope);
    self.url = 'internal-statsd:';
    process.nextTick(callback);
    return;
  }

  debug('statsd config: %j', this.config);

  if (this.config.backends.length < 1) {
    process.nextTick(function() {
      callback(Error('start failed: no backends configured'));
    });
    return;
  }

  this.server = new Server;
  this.server.start(this.config, this.logger.log, onStart);

  function onStart(er, server) {
    if (er) return callback(er);

    self._send = ipc.sender(scope);
    self.url = 'internal-statsd:';

    callback();
  }

  return this;
};

Statsd.prototype.send = function send(name, value) {
  if (this._send) {
    this._send(name, value);
    return true;
  }
  return false;
};

Statsd.prototype.stop = function stop(callback) {
  this.stopped = true;

  callback = callback || function(){};
  if (!this.server) {
    process.nextTick(callback);
    return;
  }
  this.server.stop(callback);
  this.server = null;
};

module.exports = Statsd;
