// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-npm-ls
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var assert = require('assert');
var readInstalled = require('read-installed');
var topiary = require('topiary');
var util = require('util');

exports.read = read;

function read(where, callback) {
  readInstalled(where, function(er, deps) {
    if (er) return callback(er);

    deps = stripCircular(deps);

    return callback(null, deps);
  });
};

exports.stripCircular = stripCircular;

function stripCircular(deps) {
  var stack = [];

  return strip(deps);

  function strip(deps) {
    stack.push(deps);

    delete deps.parent; // Always circular

    if (typeof deps === 'object' && 'dependencies' in deps) {
      for (var pkg in deps.dependencies) {
        if (stack.indexOf(deps.dependencies[pkg]) >= 0)
          delete deps.dependencies[pkg]; // Delete circular deps
        else
          deps.dependencies[pkg] = strip(deps.dependencies[pkg]);
      }
    }

    stack.pop();

    return deps;
  }
}

exports.deleteAllBut = deleteAllBut;

function deleteAllBut(deps, keep) {
  if (deps === '[Circular]') return deps;

  for (var prop in deps) {
    if (prop !== 'dependencies' && keep.indexOf(prop) < 0)
      delete deps[prop];
  }

  if ('dependencies' in deps) {
    for (var pkg in deps.dependencies) {
      deps.dependencies[pkg] = deleteAllBut(deps.dependencies[pkg], keep);
    }
  }
  return deps;
};

exports.convertToArray = convertToArray;

function convertToArray(deps) {
  if (deps === '[Circular]') return deps;

  if (typeof deps === 'object' && 'dependencies' in deps) {
    deps.dependencies = Object.keys(deps.dependencies).map(function(p){
      return convertToArray(deps.dependencies[p]);
    });
  }
  return deps;
};

exports.limitDepth = limitDepth;

// Use `npm ls` definition of depth, even though its weird. 0 shows
// children, 1 shows grand-children, etc.
function limitDepth(deps, depth) {
  if (depth < 0) {
    delete deps.dependencies;
    return deps;
  }

  if (deps === '[Circular]') return deps;

  if (typeof deps === 'object' && 'dependencies' in deps) {
    for (var pkg in deps.dependencies) {
      deps.dependencies[pkg] = limitDepth(deps.dependencies[pkg], depth - 1);
    }
  }

  return deps;
};

exports.printable = printable;

function printable(d, depth) {
  assert(depth != null, 'depth is mandatory');
  var options = {
    name: function name(obj) {
      return obj.name + '@' + obj.version;
    },
    sort: true,
  };
  var limited = limitDepth(d, depth);
  // topiary requires dependencies to be an array, not an object
  var prepped = convertToArray(limited);

  return topiary(prepped, 'dependencies', options);
}
