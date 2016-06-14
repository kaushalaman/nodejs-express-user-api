// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-registry
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var path = require('path');
var osenv = require('osenv');
var storage = require('./storage');
var RegistryConfig = require('./registry-config');

function getUserNpmRc() {
  return path.join(osenv.home(), '.npmrc');
}
exports.getUserNpmRc = getUserNpmRc;

exports.createDefaultConfig = function() {
  var npmRcPath = getUserNpmRc();
  return RegistryConfig.createDefault(npmRcPath);
};

exports.init = storage.init;
exports.storage = storage;
exports.RegistryConfig = RegistryConfig;
exports.printHelp = require('./help');

var commands =  {
  list: require('./commands/list'),
  add: require('./commands/add'),
  use: require('./commands/use'),
  remove: require('./commands/remove'),
  promote: require('./commands/promote'),
};
exports.commands = commands;
