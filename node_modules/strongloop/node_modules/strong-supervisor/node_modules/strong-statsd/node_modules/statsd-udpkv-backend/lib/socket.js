var dgram  = require('dgram'),
    Buffer = require('buffer').Buffer,
    _      = require('underscore')

var Socket = module.exports = function(host, port) {
  this.host = host
  this.port = port
  this.refs = 0
  this.sock = null
}

_.extend(Socket.prototype, {
  open: function() {
    if (this.sock == null) {
      this.sock = dgram.createSocket('udp4')
      this.sock.on('error', _.bind(on_socket_error, this))
    }

    ++this.refs
    return this
  },

  send: function(messages, callback) {
    var s = this
    var close = _.bind(close_socket, this)
    _.each(messages, function(msg) {
      var buffer = new Buffer(msg)
      s.sock.send(buffer, 0, msg.length, s.port, s.host, function(err, bytes) {
        callback(err); close()
      })
    })
  },
})

function close_socket() {
  --this.refs
  if (this.refs == 0 && !this.closeTimeout) {
    var s = this
    this.closeTimeout = setTimeout(function() {
      if (s.refs == 0 && s.sock != null) {
        s.sock.close()
        s.sock = null
      }
      s.closeTimeout = undefined
    }, 1000)
  }
}

function on_socket_error(err) {
  if (err) {
    console.error('socket error: ', err)
  }
  else {
    console.error('socket error: unknown')
  }

  if (this.sock != null) {
    this.sock.close()
    this.sock = null
    this.refs = 0
  }
}
