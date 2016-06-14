// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-url-defaults
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var parse = require('url').parse;
var format = require('url').format;

module.exports = normalize;

function normalize(url, defaults, overrides) {
  var _ = parse(url);

  overrides = overrides || {};

  if (_.pathname === '/')
    delete _.pathname; // So we don't get trailing '/' on URLs

  function set(from, to) {
    if (from in overrides)
      _[to] = overrides[from];
    else
      _[to] = _[to] || defaults[from];
  }

  set('path', 'pathname');
  set('host', 'hostname');
  set('port', 'port');
  set('protocol', 'protocol');
  set('auth', 'auth');

  _.slashes = true; // So we always get them

  delete _.host; // So .hostname and .port are used to format the URL

  return format(_);
}
