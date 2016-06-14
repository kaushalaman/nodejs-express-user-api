// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-registry
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

module.exports = function quoteArg(arg) {
  if (!/[ \t]/.test(arg))
    return arg;
  if (!/"/.test(arg))
    return '"' + arg + '"';

  throw new Error('command line arguments must not contain \'"\' character');
};
