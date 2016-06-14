"use strict";

var SeqId = require("seqid")
var EENano = require("eenano")

module.exports = (function getTracer() {
  if (global.transactionTracer) {
    return global.transactionTracer
  }
  global.transactionTracer = new Tracer()
  return global.transactionTracer
})()


function Tracer() {
  if (!(this instanceof Tracer)) {
    return new Tracer()
  }
  this.idgen = new SeqId()
  this.ee = new EENano()
}
Tracer.prototype.start = function (metadata) {
  var id = this.idgen.next()
  this.ee.emit("start", new TraceMessage(id, metadata))
  return id
}
Tracer.prototype.continue = function (id, metadata) {
  this.ee.emit("continue", new TraceMessage(id, metadata))
  return id
}
Tracer.prototype.end = function (id, metadata) {
  this.ee.emit("end", new TraceMessage(id, metadata))
  return id
}
Tracer.prototype.onStart = function (handler) {
  this.ee.on("start", handler)
  return this
}
Tracer.prototype.onContinue = function (handler) {
  this.ee.on("continue", handler)
  return this
}
Tracer.prototype.onEnd = function (handler) {
  this.ee.on("end", handler)
  return this
}

function TraceMessage(id, metadata) {
  this.id = id
  this.metadata = metadata || null
}
