// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

// Copyright (c) 2010-2014 Etsy, see LICENSE.etsy
/*jshint node:true, laxcomma:true */

var util = require('util');

function ConsoleBackend(startupTime, config, emitter, logger){
  var self = this;
  this.lastFlush = startupTime;
  this.lastException = startupTime;
  this.config = config.console || {};
  this.logger = logger;

  // attach
  emitter.on('flush', function(timestamp, metrics) { self.flush(timestamp, metrics); });
  emitter.on('status', function(callback) { self.status(callback); });
}

ConsoleBackend.prototype.flush = function(timestamp, metrics) {
  var when = new Date(timestamp * 1000).toISOString();
  var pid = process.pid;
  var worker = 'statsd';

  var out = {
    counters: metrics.counters,
    timers: metrics.timers,
    gauges: metrics.gauges,
    timer_data: metrics.timer_data,
    counter_rates: metrics.counter_rates,
    sets: function (vals) {
      var ret = {};
      for (var val in vals) {
        ret[val] = vals[val].values();
      }
      return ret;
    }(metrics.sets),
    pctThreshold: metrics.pctThreshold
  };

  if(this.config.prettyprint) {
    out = util.inspect(out, {depth: 5, colors: true});
    this.logger.log('%s pid:%d worker:%s stats=\n', when, pid, worker, out);
  } else {
    this.logger.log('%s pid:%d worker:%s stats=%j', when, pid, worker, out);
  }

};

ConsoleBackend.prototype.status = function(write) {
  ['lastFlush', 'lastException'].forEach(function(key) {
    write(null, 'console', key, this[key]);
  }, this);
};

exports.init = function(startupTime, config, events, logger) {
  var instance = new ConsoleBackend(startupTime, config, events, logger);
  return true;
};
