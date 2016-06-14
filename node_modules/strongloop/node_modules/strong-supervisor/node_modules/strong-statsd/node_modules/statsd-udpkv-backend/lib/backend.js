var Socket = require('./socket'),
    mf     = require('./mf'),
    Buffer = require('buffer').Buffer,
    util   = require('util'),
    fmt    = require('fmt'),
    _      = require('underscore')

var l, debug, dumpMessages
var noopLogger = {
  log: function(){},
}

var Backend = module.exports = function(options, time, binder, logger) {
  l = logger || noopLogger
  debug = options.debug
  dumpMessages = options.dumpMessages

  this.sock = options.socket
    ? options.socket
    : new Socket(options.host, options.port)

  this.vars = options.vars
  this.mf = mf.formatter(options.format)
  this.stats = {
    last_flush: time,
    last_exception: time,
  }

  if (binder) {
    binder(_.bind(this.flush, this), _.bind(this.status, this))
  }
}

_.extend(Backend.prototype, {
  flush: function(time, metrics) {

    var date = new Date(time * 1000)
    var data = _.union(
      collect_timers(date, metrics.timers, this.vars),
      collect_gauges(date, metrics.gauges, this.vars),
      collect_counters(date, metrics.counters, this.vars))

    if (data.length == 0)
      return

    var messages = _.map(data, this.mf.format)
    send_messages(this.sock, messages)
  },

  status: function(callback) {
    for (var key in this.stats) {
      callback(null, 'udpkv', key, this.stats[key])
    }
  },
})

function send_messages(s, messages) {
  if (dumpMessages)
    l.log(messages)

  s.open().send(messages, function(err) {
    if (err) l.log('send error: ' + err)
  })
}

function collect_timers(date, timers, vars) {
  var metrics = []
  for (var key in timers) {
    var data = timers[key].length
      ? timers[key] : [0]

    var sum = _.reduce(data, function(memo, num) {
      return memo + num
    }, 0)

    var metric = _.extend({
      time:    date,
      stat:    key,
      min:     _.min(data),
      max:     _.max(data),
      avg:     sum / data.length,
      samples: data.length,
    }, vars)

    metric[key] = metric.avg
    metrics.push(metric)
  }

  return metrics
}

function collect_gauges(date, gauges, vars) {
  var metrics = []
  for (var key in filter_metrics(gauges)) {
    var metric = _.extend({
      time:  date,
      stat:  key,
      gauge: gauges[key],
    }, vars)

    metric[key] = metric.gauge
    metrics.push(metric)
  }

  return metrics
}

function collect_counters(date, counters, vars) {
  var metrics = []
  for (var key in filter_metrics(counters)) {
    var metric = _.extend({
      time:  date,
      stat:  key,
      count: counters[key],
    }, vars)

    metric[key] = metric.count
    metrics.push(metric)
  }

  return metrics
}

function filter_metrics(metrics) {
  var result = {}, keys = _.keys(metrics || {})
  _.each(keys, function(key) {
    if (key.indexOf('statsd.') == -1)
      result[key] = metrics[key]
  })
  return result
}

function report_success(metric_params, stats) {
  stats.last_flush = Math.round(new Date().getTime() / 1000)

  if (!dumpMessages) return
  var data = metric_params.MetricData
  var counters = _.where(data, { Unit: 'Count' }),
      timers = _.where(data, { Unit: 'Milliseconds' }),
      gauges = _.where(data, { Unit: 'None' })

  var s = 'udpkv recieved ' +
    counters.length + ' counters, ' +
    timers.length + ' timers, and ' +
    gauges.length + ' gauges' 

   l.log(s)
}

function report_error(err, stats) {
  stats.last_exception = Math.round(new Date().getTime() / 1000)
  l.log('udpkv ' + err.code + ': ' + err.message)
  if (dumpMessages) fmt.dump(err)
}
