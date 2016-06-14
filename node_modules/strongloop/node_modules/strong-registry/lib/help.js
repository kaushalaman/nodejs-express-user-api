// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-registry
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

exports = module.exports = function printHelp($0, println) {
  println();
  println('  Usage: %s [options] [command]', $0);
  println();
  println('  Commands:');
  println();
  println('    list               print registry configurations (default)');
  println('    add <name> [url]   create a new registry configuration');
  println('    use <name>         modify ~/.npmrc to use a different registry');
  println('    remove <name>      remove registry configuration');
  println();
  println('    promote [options] <package>@<version>');
  println('                       promote a package to another registry');
  println();
  println('  Options:');
  println();
  println('    -h, --help         print usage information');
  println('    -v, --version      print the version number');
  println();
  println('  Options (%s promote):', $0);
  println();
  println('    --from <name>      the registry to download from');
  println('    --to <name>        the registry to publish to');
  println('   Omit one of --from or --to to use the current registry.');
  println();
};
