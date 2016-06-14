// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: strong-start
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var Pm = require('./lib/pm');
var assert = require('assert');
var debug = require('debug')('strong-start:start');
var deploy = require('strong-deploy').local;
var fs = require('fs');
var path = require('path');

module.exports = start;

function start(app, done) {
  debug('app is %j', app);

  var pkg = path.resolve(app || '.', 'package.json');
  var name = require(pkg).name;

  var pm = new Pm();

  pm.start(run);

  function run(err, logAt) {
    if (err) {
      console.error('%s', err);
      return done(err);
    }

    debug('deploy to %j app %j', pm.url, app);
    deploy({
      baseURL: pm.url,
      serviceName: name,
      branchOrPack: app,
      clusterSize: 1,
    }, function(err, service) {
      ran(err, service, logAt);
    });
  }

  function ran(err, service, logAt) {
    assert.ifError(err);
    var msg = fs.readFileSync(require.resolve('./started.txt'), 'utf-8')
    .replace(/%APP%/g, app)
    .replace(/%SVC%/g, service.name || service.id)
    .trim();
    console.log(msg);
    console.log('');
    console.log('--- tail of %s ---', pm.logFile);
    tail(pm.logFile, logAt, function() {
      return done();
    });
  }
}

function tail(file, logAt, callback) {
  var buf = new Buffer(4096);
  fs.open(file, 'r', function(err, fd) {
    // If you removed your log file... you don't get logs.
    if (err)
      return callback();

    var quiet = false;

    read(timeout);

    function timeout(err, data) {
      // If we errored, we're done.
      if (err)
        return callback();

      // If we read data, keep reading.
      if (data) {
        quiet = false;
        return process.stdout.write(data, function() {
          read(timeout);
        });
      }

      // If there is no data after the quiet period, we're done.
      if (quiet)
        return callback();

      setTimeout(function() {
        quiet = true;
        read(timeout);
      }, 1000);
    }

    function read(callback) {
      fs.read(fd, buf, 0, buf.length, logAt, function(err, size) {
        if (err)
          return callback(err);

        if (size > 0) {
          logAt += size;
          return callback(null, buf.slice(0, size));
        }

        return callback();
      });
    }
  });
}
