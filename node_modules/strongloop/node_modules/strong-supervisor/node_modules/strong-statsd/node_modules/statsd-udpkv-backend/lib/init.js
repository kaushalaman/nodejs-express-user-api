var Backend = require('./backend'),
    _       = require('underscore');

exports.init = function(startupTime, config, emitter, logger) {
  config = _.defaults(config.udpkv || {}, {
    debug: config.debug,
    dumpMessages: config.dumpMessages,
    vars: {},
  })

  var addr = addr_to_array(config.addr)
  config.host = config.host || addr[0]
  config.port = config.port || addr[1]

  if (!config.host || !config.port) {
    logger.log('no host:port defined for udp transport')
    return false
  }

  startup(config, startupTime, emitter, logger)
  return true
}

function addr_to_array(addr) {
  var m = (addr || '').match(/([\w\.]+):([\d]+)/)
  return m ? m.slice(1) : []
}

function startup(config, time, emitter, logger) {
  new Backend(config, time, function(flush, status) {
    if (flush) emitter.on('flush', flush)
    if (status) emitter.on('status', status)
  }, logger)
}
