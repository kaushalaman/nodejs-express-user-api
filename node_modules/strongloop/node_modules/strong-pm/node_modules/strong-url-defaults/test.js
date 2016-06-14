// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-url-defaults
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var fmt = require('util').format;
var set = require('./');
var tap = require('tap');

function test(from, expect, defaults, overrides) {
  tap.test(fmt('from %j to %j', from, expect), function(t) {
    var got = set(from, defaults, overrides);
    t.equal(got, expect);
    t.end();
  });
}

test(
  'http:',
  'http://localhost:8701',
  {host: 'localhost', port: 8701});
test(
  'http://',
  'http://localhost:8701',
  {host: 'localhost', port: 8701});
test(
  'http://example.com',
  'http://example.com:8701',
  {host: 'localhost', port: 8701});
test(
  'http://:80',
  'http://localhost:80',
  {host: 'localhost', port: 8701});
test(
  'http://example.com:80',
  'http://example.com:80',
  {host: 'localhost', port: 8701});
test(
  'http+ssh:',
  'http+ssh://localhost:8701',
  {host: 'localhost', port: 8701});
test(
  'http+ssh://',
  'http+ssh://localhost:8701',
  {host: 'localhost', port: 8701});
test(
  'http+ssh://example.com',
  'http+ssh://example.com:8701',
  {host: 'localhost', port: 8701});
test(
  'http+ssh://:80',
  'http+ssh://localhost:80',
  {host: 'localhost', port: 8701});
test(
  'http+ssh://example.com:80',
  'http+ssh://example.com:80',
  {host: 'localhost', port: 8701});
test(
  'http:',
  'http://localhost:8701/api',
  {host: 'localhost', port: 8701},
  {path: '/api'});
test(
  'http://',
  'http://localhost:8701/api',
  {host: 'localhost', port: 8701},
  {path: '/api'});
test(
  'http://example.com',
  'http://example.com:8701/api',
  {host: 'localhost', port: 8701},
  {path: '/api'});
test(
  'http://:80',
  'http://localhost:80/api',
  {host: 'localhost', port: 8701},
  {path: '/api'});
test(
  'http://example.com:80',
  'http://example.com:80/api',
  {host: 'localhost', port: 8701},
  {path: '/api'});
test(
  'http:',
  'ws://localhost:8701/channel',
  {host: 'localhost', port: 8701},
  {protocol: 'ws', path: '/channel'});
test(
  'http://example.com',
  'ws://example.com:8701/channel',
  {host: 'localhost', port: 8701},
  {protocol: 'ws', path: '/channel'});
test(
  'http://example.com:80',
  'ws://example.com:80/channel',
  {host: 'localhost', port: 8701},
  {protocol: 'ws', path: '/channel'});
test(
  'http://:80',
  'ws://localhost:80/channel',
  {host: 'localhost', port: 8701},
  {protocol: 'ws', path: '/channel'});
test(
  'http://TOKEN@example.com',
  'ws://example.com:8701/channel',
  {host: 'localhost', port: 8701},
  {protocol: 'ws', auth: null, path: '/channel'});
test(
  'http://OTHER@example.com',
  'ws://TOKEN@example.com:8701/channel',
  {host: 'localhost', port: 8701},
  {protocol: 'ws', auth: 'TOKEN', path: '/channel'});
test(
  'http://example.com',
  'ws://TOKEN@example.com:8701/channel',
  {host: 'localhost', port: 8701, auth: 'TOKEN'},
  {protocol: 'ws', path: '/channel'});
test(
  'http://',
  'http://localhost/fu',
  {host: 'localhost', path: 'fu'});
test(
  'http://',
  'http://localhost/fu',
  {host: 'localhost', path: '/fu'});
test(
  'http:///',
  'http://localhost/fu',
  {host: 'localhost', path: '/fu'});
test(
  'http:///bar',
  'http://localhost/bar',
  {host: 'localhost', path: '/fu'});
test(
  'http://host/',
  'http://host/fu',
  {host: 'localhost', path: '/fu'});
test(
  'http://host/bar',
  'http://host/bar',
  {host: 'localhost', path: '/fu'});
test(
  'http:///',
  'http://localhost/fu',
  {host: 'localhost'},
  {path: '/fu'});
test(
  'http:///bar',
  'http://localhost/fu',
  {host: 'localhost'},
  {path: '/fu'});
test(
  'http://x/bar',
  'http://x/fu',
  {host: 'localhost'},
  {path: '/fu'});
