// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: strong-runner
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var Transform = require('stream').Transform;
var debug = require('debug');
var inherits = require('util').inherits;

module.exports = Stdio;

function Stdio(name, noStdioDebug) {
  if (!(this instanceof Stdio))
    return new Stdio(name, noStdioDebug);

  Transform.call(this);

  console.assert(name);

  this.name = name;
  if (noStdioDebug)
    this.debug = function() {};
  else
    this.debug = debug('strong-runner:stdio:' + this.name);
  this.setMaxListeners(0); // Allow many simultaneous pipes to/from this stream.
}

inherits(Stdio, Transform);

Stdio.prototype._transform = function(chunk, encoding, callback) {
  this.debug('%s', chunk);
  this.push(chunk, encoding);
  return callback();
};

Stdio.prototype.from = function(readable) {
  readable.pipe(this, {end: false});
};
