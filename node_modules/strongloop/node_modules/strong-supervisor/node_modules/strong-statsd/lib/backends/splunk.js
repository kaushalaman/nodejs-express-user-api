// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var assert = require('assert');
var dns = require('dns');
var fmt = require('util').format;
var udpkv = require('statsd-udpkv-backend');

var host;

exports.init = function(_, config) {
  assert(config.udpkv.host, 'host missing');
  assert(config.udpkv.port, 'port missing');

  host = config.udpkv.host;

  return udpkv.init.apply(udpkv, arguments);
};

exports.check = function(callback) {
  dns.lookup(host, function(er) {
    if (er) {
      var er = Error(fmt(
        'Failed to load backend: splunk (lookup %j failed with %s)',
        host, er.message));
      return callback(er);
    }
    return callback();
  });
};
