// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

// Not a real server... but patch node-syslog so we can observe methods on it
// for test purposes.

var EE = require('events').EventEmitter;

module.exports = Syslog;

function Syslog(syslog) {
  var self = new EE;

  self._init = syslog.init;
  syslog.init = function(application, options, facility) {
    self._init.call(syslog, application, options, facility);
    self.emit('init', {
      application: application,
      options: options,
      facility: facility,
    });
  };

  self._log = syslog.log;
  syslog.log = function(priority, message) {
    self._log.call(syslog, priority, message);
    self.emit('log', {
      priority: priority,
      message: message,
    });
  };

  self.unref = function() {
  };

  self.url = 'syslog:';

  process.nextTick(self.emit.bind(self, 'listening'));

  return self;
}
