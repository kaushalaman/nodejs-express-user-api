"use strict";

module.exports = SeqId

function SeqId(initial) {
  if (!(this instanceof SeqId)) {
    return new SeqId(initial)
  }
  if (initial == null) {
    initial = (Math.random() - 0.5) * Math.pow(2, 32)
  }
  this._id = initial | 0
}
SeqId.prototype.next = function () {
  this._id = (this._id + 1) | 0
  return this._id
}
