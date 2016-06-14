// Copyright IBM Corp. 2014,2015. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var fs = require('fs');
var util = require('util');

function LogBackend(startupTime, config, emitter, logger) {
  var config = config.log || {};
  var file = config.file || '-';
  var out;

  if (file === '-')
    out = config.stdout;
  else {
    // Try and determine synchronously whether we will be able to open the file.
    // This is a work-around for the statsd backend initialization being
    // synchronous, ATM.
    try {
      fs.close(fs.openSync(file, 'a'));
    } catch(er) {
      throw Error('Failed to load backend: log (' + er.message + ')');
    }
    out = fs.createWriteStream(file, {flags: 'a'});
  }

  emitter.on('flush', function(timestamp, metrics) {
    var ts = new Date(timestamp * 1000).toISOString();
    write(ts, metrics.counters, 'count');
    write(ts, metrics.timers, 'ms');
    write(ts, metrics.gauges, 'gauge');
  });

  function write(ts, metrics, type) {
    for (var name in metrics)
      out.write(util.format('%s %s=%s (%s)\n', ts, name, metrics[name], type));
  }

  return true; // Required to indicate success
}

exports.init = LogBackend;
