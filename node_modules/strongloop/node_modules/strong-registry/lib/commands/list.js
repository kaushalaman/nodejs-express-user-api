// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-registry
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var storage = require('../storage');
var RegistryConfig = require('../registry-config');
var defaults = require('../').createDefaultConfig();

module.exports = function listRegistries($0) {
  console.log('Available configurations:\n');

  storage.listNames().forEach(function(name) {
    var rc = new RegistryConfig(storage.load(name));
    var isActive = rc.registry == defaults.registry;
    var marker = isActive ? '*' : ' ';
    console.log(' %s %s (%s)', marker, name, rc.registry);
  });

  console.log('\nRun `%s use <name>` to switch to a different registry.', $0);
  console.log('Run `%s -h` to learn about other available commands.', $0);
};
