# strong-wait-till-listening

This module provides a utility function to wait until there is a TCP server 
listening on a given port.

## Installation

```sh
$ npm install strong-wait-till-listening
```

## Usage

```js
var waitTillListening = require('strong-wait-till-listening');

waitTillListening(
  {
    // optional, defaults to 'localhost'
    host: 'localhost',
    port: 3000,
    timeoutInMs: 20000,
    // optional, defaults to 50
    pollingIntervalInMs: 50
  },
  function waitCallback(err) {
  }
);
```
