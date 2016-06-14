// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: strong-runner
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var Commit = require('strong-fork-cicada/lib/commit');
var assert = require('assert');
var extend = require('util')._extend;
var fmt = require('util').format;

module.exports = function Runnable(options) {
  assert(options && options.dir, 'options.dir');

  var commit = Commit({
    hash: options.hash,
    id: options.id,
    dir: options.dir,
    repo: options.repo,
    branch: options.branch,
  });
  commit.runInPlace = options.runInPlace;
  commit.env = extend({}, options.env);

  return commit;
};

module.exports.toString = function c2s(c) {
  if (!c) return '(none)';

  return fmt('%s/%s', c.repo, c.branch);
};
