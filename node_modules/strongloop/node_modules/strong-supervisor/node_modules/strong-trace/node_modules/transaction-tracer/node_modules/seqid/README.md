seqid
=====

[![NPM](https://nodei.co/npm/seqid.png)](https://nodei.co/npm/seqid/)

`seqid` is a sequential id generator of the simplest variety. It is inspired by TCP sequencing, such that it will just generate integer sequential ids.

The ids generated are signed integers, I.e. if the id being generated would ever exceed 2147483648 it rolls over to -2147483647 and continues.

This means you can get repeated ids if you generate enough.

The ideal use-case for this tool is generating ephemeral ids for communication or coordination or matching.

```javascript
var SeqId = require("seqid")

var id = SeqId(0)
console.log(id.next()) // 1
console.log(id.next()) // 2
```

API
===

`var id = require("seqid")([initial])`
---

Create the id generator with optional `initial` value. Otherwise it will generate a random initial value.

`id.next()`
---

Get the next value in sequence. It will always be a signed integer.

LICENSE
=======

MIT
