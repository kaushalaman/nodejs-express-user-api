#!/usr/bin/env node
// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: strong-start
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

// Exit on loss of parent process, if it had established an ipc control channel.
// We do this ASAP because we don't want child processes to leak, outliving
// their parent. If the parent has not established an 'ipc' channel to us, this
// will be a no-op, the disconnect event will never occur.
process.on('disconnect', function() {
  process.exit(2);
});

var Parser = require('posix-getopt').BasicParser;
var fs = require('fs');
var path = require('path');
var start = require('../');

var $0 = process.env.CMD ? process.env.CMD : path.basename(process.argv[1]);
var USAGE = fs.readFileSync(require.resolve('./sl-start.txt'), 'utf-8')
  .replace(/%MAIN%/g, $0)
  .trim();
var parser = new Parser([
  ':v(version)',
  'h(help)',
].join(''), process.argv);

var option;
while ((option = parser.getopt()) !== undefined) {
  switch (option.option) {
    case 'v':
      console.log(require('../package.json').version);
      process.exit(0);
      break;
    case 'h':
      console.log(USAGE);
      process.exit(0);
      break;
    default:
      console.error('Invalid usage (near option \'%s\'), try `%s --help`.',
        option.optopt, $0);
      process.exit(1);
  }
}

var app = process.argv[parser.optind()];

start(app || '.', function(err) {
  process.exit(err ? 1 : 0);
});
