strong-pack
===========

Simple wrapper for `tar` for packaging a node application, including everything
except version control files (`.git`, `.svn`, `.hg`, etc.). In other words, it
is like `npm pack`, but it does **not** honour `.npmignore` and `.gitignore`.

### Usage

The strong-pack module exports a single function.

#### `pack(dirname)`
 * arguments:
   * `dirname` is the path to a node module.
 * return:
   * a readable stream containing the tar stream, rooted in `package/` just like
    `npm pack`.

The readable stream that is returned is a `tar-stream` pack stream, which has
additional methods on it, including `.entry()` which can be used for injecting
files directly into the tar archive without having to create them on disk first.
See the [tar-stream docs](https://github.com/mafintosh/tar-stream#packing) for
more details.

#### Example

The following example is similar to running `npm pack path/to/app` if npm
ignored all of the normal rules for ignoring/including files.

```js
var fs = require('fs');
var gz = require('zlib').Gzip();
var pack = require('strong-pack');
var tgz = fs.createWriteStream('app.tgz', 'binary');
var appTar = pack('path/to/app');

// inject a file directly into the tar stream without creating a file on disk
appTar.entry({name: 'package/.injected.json'},
             JSON.stringify({key: 'secret'}) + '\n');

// Using pipe
// don't forget to handle errors and clean up ALL your streams!
appTar.pipe(gz).pipe(tgz);

// Using pump
// streams get cleaned up for you, only one place to check for an error
var pump = require('pump');
pump(appTar, gz, tgz, function(err) {
  // err || done! don't forget to check for an error!
});
```

### License

This module is dual licensed and can be used under the terms of either:
 * [Artistic 2.0 License](https://opensource.org/licenses/Artistic-2.0)

---
Copyright IBM Corp. 2015,2016. All Rights Reserved.
