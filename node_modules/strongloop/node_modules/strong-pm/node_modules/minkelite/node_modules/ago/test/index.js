var test = require("tape").test

var ago = require("../")

test("ago", function (t) {
  function closeTo(a, b) {
    var diff = a - b
    t.ok(Math.abs(diff) < 10, "numbers are within 10 millis")
  }

  closeTo(ago(199), Date.now() - 199)
  closeTo(ago(1, "min"), Date.now() - 60000)
  closeTo(ago(1, "minute"), Date.now() - 60000)
  closeTo(ago(2, "h"), Date.now() - 1000 * 60 * 60 * 2)
  closeTo(ago(1.5, "d"), Date.now() - 1000 * 60 * 60 * 24 * 1.5)
  closeTo(ago(3, "weeks"), Date.now() - 1000 * 60 * 60 * 24 * 7 * 3)
  closeTo(ago(2, "months"), Date.now() - 1000 * 60 * 60 * 24 * 30.4375 * 2)
  closeTo(ago(1, "qtr"), Date.now() - 1000 * 60 * 60 * 24 * 7 * 13)
  closeTo(ago(5, "y"), Date.now() - 1000 * 60 * 60 * 24 * 365.25 * 5)

  t.end()
})

test("fromNow", function (t) {
  function closeTo(a, b) {
    var diff = a - b
    t.ok(Math.abs(diff) < 10, "numbers are within 10 millis")
  }

  closeTo(ago.fromNow(199), Date.now() + 199)
  closeTo(ago.fromNow(1, "min"), Date.now() + 60000)
  closeTo(ago.fromNow(1, "minute"), Date.now() + 60000)
  closeTo(ago.fromNow(2, "h"), Date.now() + 1000 * 60 * 60 * 2)
  closeTo(ago.fromNow(1.5, "d"), Date.now() + 1000 * 60 * 60 * 24 * 1.5)
  closeTo(ago.fromNow(3, "weeks"), Date.now() + 1000 * 60 * 60 * 24 * 7 * 3)
  closeTo(ago.fromNow(2, "months"), Date.now() + 1000 * 60 * 60 * 24 * 30.4375 * 2)
  closeTo(ago.fromNow(1, "qtr"), Date.now() + 1000 * 60 * 60 * 24 * 7 * 13)
  closeTo(ago.fromNow(5, "y"), Date.now() + 1000 * 60 * 60 * 24 * 365.25 * 5)

  t.end()
})