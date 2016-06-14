// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

// Copyright (c) 2010-2014 Etsy, see LICENSE.etsy
/*jshint node:true, laxcomma:true */

var util = require('util')
  , dgram = require('dgram')

var l;
var debug;

function RepeaterBackend(startupTime, config, emitter){
  var self = this;
  this.config = config.repeater || [];
  this.sock = (config.repeaterProtocol == 'udp6') ?
        dgram.createSocket('udp6') :
        dgram.createSocket('udp4');
  this.sock.unref();
  // Attach DNS error handler
  this.sock.on('error', function (err) {
    if (debug) {
      l.log('Repeater error: ' + err);
    }
  });
  // attach
  emitter.on('packet', function(packet, rinfo) { self.process(packet, rinfo); });
}

RepeaterBackend.prototype.process = function(packet, rinfo) {
  var self = this;
  hosts = self.config;
  for(var i=0; i<hosts.length; i++) {
    self.sock.send(packet,0,packet.length,hosts[i].port,hosts[i].host,
                   function(err,bytes) {
      if (err && debug) {
        l.log(err);
      }
    });
  }
};

exports.init = function(startupTime, config, events, logger) {
  var instance = new RepeaterBackend(startupTime, config, events);
  debug = config.debug;
  l = logger;
  return true;
};
