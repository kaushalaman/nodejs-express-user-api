module.exports = EENano

function EENano() {
  if (!(this instanceof EENano)) return new EENano()
  this._listeners = {}
  this.hasListeners = false
}
EENano.prototype.emit = Function()
function emit(event, metadata) {
  var handlers = this._listeners[event]
  if (handlers != null) {
    for (var i = 0; i < handlers.length; i++) {
      handlers[i].call(this, metadata)
    }
  }
}
EENano.prototype.on = function (event, handler) {
  if (!this.hasListeners) {
    this.emit = emit
    this.hasListeners = true
  }
  this._listeners[event] = this.listeners(event).concat(handler)
}
EENano.prototype.events = function () {
  return Object.keys(this._listeners)
}
EENano.prototype.listeners = function (event) {
  return this._listeners[event] || []
}
