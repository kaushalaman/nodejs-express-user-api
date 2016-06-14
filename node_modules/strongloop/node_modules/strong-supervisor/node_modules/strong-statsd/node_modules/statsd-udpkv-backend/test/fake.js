var _ = require('underscore')

var Fake = module.exports = {
  Socket: function() {
    this.host = "abc"
    this.port = 123
    this.messages = []
  },
}

_.extend(Fake.Socket.prototype, {
  open: function() { return this },
  send: function(messages, complete) {
    var list = this.messages
    _.each(messages, function(m) {
      list.push(m)
    })
    complete()
  },
})
