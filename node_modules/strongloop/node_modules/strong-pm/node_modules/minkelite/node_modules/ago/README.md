ago
===

[![NPM](https://nodei.co/npm/ago.png)](https://nodei.co/npm/ago/)

`ago` is a simple function for calculating a timestamp some amount of time ago. (or in the future)

```js
var ago = require("ago")

ago(344) // 344 milliseconds ago, e.g. 1376505400233
ago(344, "ms") // same as above, default unit is "ms"
ago(4, "minutes") // four minutes ago
ago(3, "days") // 3 * 24 hours ago
ago(1, "quarter") // one quarter (13 weeks) ago

ago(2, "months") // months are approximate (30.4375 days)
ago(22, "y") // years are approximate as well (365.25 days)

console.log(new Date(ago(35.3086, "y")))
// Mon Apr 24 1978 00:06:49 GMT-0800 (PDT)

// It also exposes a fromNow() function to calculate future times. e.g:
ago.fromNow(1, "year")
// is just sugar for:
ago(-1, "year")


```

API
---

`ago(number [,unit])`
---------------------

Calculate a millisecond epoch timestamp relative to right now.

  * number: a number (e.g. 1, 20, 0.25)
  * unit: a time unit. Defaults to milliseconds
    * ms, millis, millisecond, milliseconds
    * s, sec, secs, second, seconds
    * m, min, mins, minute, minutes
    * h hr, hrs, hour, hours
    * d, day, days
    * w, wk, wks, week, weeks
    * M, mon, mons, month, months (30.4375 days)
    * q, qtr, qtrs, quarter, quarters
    * y, yr, yrs, year, years (365.25 days)

`ago.fromNow(number [,unit])`
-----------------------------

This is a convenience function for `ago(-number, [,unit])` for finding timestamps in the future.

LICENSE
=======
MIT