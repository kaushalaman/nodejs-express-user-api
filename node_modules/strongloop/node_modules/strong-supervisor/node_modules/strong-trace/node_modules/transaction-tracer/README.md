transaction-tracer
=====

[![NPM](https://nodei.co/npm/transaction-tracer.png)](https://nodei.co/npm/transaction-tracer/)

`transaction-tracer` is an extremely lightweight transaction tracing tool for helping you trace things that cross the event loop without having to use wrappers ("monkeypatching").

It provides you with three events you can emit and listen to -- `start`, `continue`, and `end`. When you `start` a transaction, you are provided with an id for that transaction.

This id then needs to be provided to `continue` or `end` events in order to later match up these events to tie the traces together.

It is designed to be as lightweight as possible, such that you can leave the tracing code in even if nothing is listening to the events with very little overhead. If there are no listeners, the overhead for a tracing event is:

```
  function call (e.g. tx.start())
  (for start only) function call & one integer increment & one bitwise integer operation
  function call (object constructor)
  function call (noop if no listeners)
```
If there are listeners for the tracing events, the overhead will likely be dominated by the code to track the tracing.

The purpose of this library is as a straw-man proposal for a unified transaction tracing interface that is easy for transaction tracing libraries to use in common that can be easily mirrored by other tracing interfaces (provided by core?) for a more cohesive experience.

Ideally this would enable module authors to add custom instrumentation to their code with minimal overhead that would be vendor non-specific for how any tracing is measured.

There are still some TBDs here, such as what metadata could be sent to provide a consistent and useful interface from module-to-module.

Usage Example
---
```javascript
// to enable transactions, simply require transaction-tracer
// if it is re-required in separate flies, the same tracer will be provided.
var tx = require("transaction-tracer")

tx.onStart(console.log)
tx.onContinue(console.log)
tx.onEnd(console.log)

var id = tx.start("foo") // {id: 1234, metadata: "foo"}
tx.continue(id, "123")  // {id: 1234, metadata: "123"}
tx.continue(id, "456")  // {id: 1234, metadata: "456"}
setTimeout(function () {
  tx.end(id, "bar")  // {id: 1234, metadata: "bar"}
}, 500)
```

A more complicated example of a very simple tracer is in the examples/ folder.

This example traces two types of "transactions" -- `http.request()` calls, and a `setTimeout` with the same tracing code.

The timing and logging is all neatly handled inside the tracing listeners, and the asynchronous transactions simply need to let it know when it is `start`ing or `end`ing.

Notice the tracer in examples/ is *not* a production-quality tracer and has a few issues (e.g. it leaks transactions) and contrivances (intentionally overcomplicated) that shouldn't be emulated in production code.

API
===

`var tx = require("transaction-tracer")`
---

Instantiates or returns the already instantiated transaction tracer object.

`var id = tx.start([metadata])`
---

Start a transaction, with a transaction `id` returned.

`tx.continue(id[, metadata])`
---

Mark a continuation point for a transaction.

`tx.end(id[, metadata])`
---

Mark the endpoint for a transaction.

`tx.onStart(handler)`
---

Calls `handler` whenever a transaction starts.

`tx.onContinue(handler)`
---

Calls `handler` whenever a transaction continuation event happens.

`tx.onEnd(handler)`
---

Calls `handler` whenever a transaction ends.

LICENSE
=======

MIT
