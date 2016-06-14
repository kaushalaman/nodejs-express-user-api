var _ = require('underscore')

module.exports = {
  formatter: function(spec) {
    switch (spec || '') {
      case '[{{=time}}] {{metric=}} {{vars=}}':
        return { format: boxy_time_header }
      default:
        return { format: default_formatter }
    }
  },
}

function default_formatter(metric) {
  var pairs = _.map(_.pairs(metric), function(pair) {
    return pair.join('=')
  })

  return pairs.join(' ')
}

function boxy_time_header(metric) {
  var header =  '[' + metric.time.toISOString() + '] '
  var map = _.omit(metric, 'time')
  return header + default_formatter(map)
}
