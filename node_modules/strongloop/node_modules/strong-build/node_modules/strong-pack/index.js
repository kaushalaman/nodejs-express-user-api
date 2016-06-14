// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-pack
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var debug = require('debug')('strong-pack');
var path = require('path');
var tar = require('tar-fs');

module.exports = exports = pack;

var FILTER = filterize([
  '.git',
  'CVS',
  '.svn',
  '.hg',
  '.lock-wscript',
  /^\.wafpickle-[0-9]+$/,
  /^\..*\.swp$/,
  '.DS_Store',
  /^\._/,
]);

// If we are running on Windows there won't be any permission bits set so we
// have to pretend. These get bitwise OR'd with the actual permissions, so we
// use 0 for platforms that will have real bits already.
var DMODE = /win32/.test(process.platform) ? parseInt('755', 8) : 0;
var FMODE = /win32/.test(process.platform) ? parseInt('644', 8) : 0;

function pack(folder) {
  var tarPack = tar.pack(folder, {
    ignore: FILTER,
    fmode: FMODE,
    dmode: DMODE,
    map: function(header) {
      if (header.name === '.') {
        header.name = 'package';
      } else {
        header.name = 'package/' + header.name;
      }
      return header;
    },
  });
  if (debug.enabled) {
    tarPack.on('error', debug.bind(null, 'tar creation error'));
  }
  return tarPack;
}

function filterize(patterns) {
  patterns = patterns.map(testable);
  return filter;
  function filter(entry) {
    var basename = path.basename(entry);
    return patterns.some(function(p) { return p.test(basename); });
  }
  function testable(pattern) {
    if (pattern instanceof RegExp) {
      return pattern;
    }
    return new RegExp('^' + pattern + '$');
  }
}
