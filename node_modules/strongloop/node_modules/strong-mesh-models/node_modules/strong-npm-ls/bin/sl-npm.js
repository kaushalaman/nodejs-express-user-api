#!/usr/bin/env node
// Copyright IBM Corp. 2014,2015. All Rights Reserved.
// Node module: strong-npm-ls
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var tree = require('../');
var util = require('util');

module.exports = function(printable) {
  var where = process.argv[2] || '.';
  var depth = process.argv[3] == null ? Number.MAX_VALUE : +process.argv[3];

  tree.read(where, function(e,d) {
    if (e) throw e;
    if (printable)
      console.log(tree.printable(d, depth));
    else
      console.log(JSON.stringify(d, null, 2));
  });
};
