strong-url-defaults
===================

Normalize URLs, providing defaults and overrides.

## defaults = require('strong-url-defaults')

Exports a single function, `defaults()`.

## url = defaults(url, defaults[, overrides])

- url {String} url to reformat
- defaults {Object} components to set on `url` if they were not already set.
- overrides {Object} components to set on `url` *even if* they were already set.

Defaults can be any of:

- `host`
- `port`
- `auth`

Its not possible to distinguish with `url.parse()` whether a path was supplied,
so it can't be "defaulted".

Overrides can be any of:

- `protocol`
- `host`
- `port`
- `path`
- `auth`
