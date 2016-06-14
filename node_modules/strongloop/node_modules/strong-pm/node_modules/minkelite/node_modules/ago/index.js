module.exports = ago
module.exports.fromNow = fromNow

var isNumber = require("isnumber")

var SECOND = 1000
var MINUTE = SECOND * 60
var HOUR = MINUTE * 60
var DAY = HOUR * 24
var WEEK = DAY * 7
// Stupid non-standard month length
var MONTH = DAY * 30.4375
var QUARTER = WEEK * 13
// Leap years...
var YEAR = DAY * 365.25

/**
 * Return an epoch timestamp (millisecond) some amount of time ago. Accepts multiple
 * units from milliseconds to years. Months and years are approximated.
 *
 * @param  {Number} amount Amount of time in `unit` default unit: milliseconds
 * @param  {String} unit   Unit of time. If not provided, will be milliseconds
 *                         ms, millis, millisecond, milliseconds
 *                         s, sec, secs, second, seconds
 *                         m, min, mins, minute, minutes
 *                         h hr, hrs, hour, hours
 *                         d, day, days
 *                         w, wk, wks, week, weeks
 *                         M, mon, mons, month, months (30.4375 days)
 *                         q, qtr, qtrs, quarter, quarters
 *                         y, yr, yrs, year, years (365.25 days)
 * @return {Number}        Epoch (millisecond) time based on the input.
 */
function ago(amount, unit) {
  if (!isNumber(amount)) throw new Error("Usage ago(amount [,timeUnit])")

  return Date.now() - (+amount * unitToMillis(unit))
}

function fromNow(amount, unit) {
  if (!isNumber(amount)) throw new Error("Usage ago(amount [,timeUnit])")
  return ago(-amount, unit)
}

function unitToMillis(unit) {
  if (unit == null) return 1

  var millis = 1

  switch (unit) {
    case "ms":
    case "millis":
    case "millisecond":
    case "milliseconds":
      break
    case "s":
    case "sec":
    case "secs":
    case "second":
    case "seconds":
      millis = SECOND
      break
    case "m":
    case "min":
    case "mins":
    case "minute":
    case "minutes":
      millis = MINUTE
      break
    case "h":
    case "hr":
    case "hrs":
    case "hour":
    case "hours":
      millis = HOUR
      break
    case "d":
    case "day":
    case "days":
      millis = DAY
      break
    case "w":
    case "wk":
    case "wks":
    case "week":
    case "weeks":
      millis = WEEK
      break
    case "M":
    case "mon":
    case "mons":
    case "month":
    case "months":
      // stupid nonstandard month length...
      millis = MONTH
      break
    case "q":
    case "qtr":
    case "qtrs":
    case "quarter":
    case "quarters":
      // 13 weeks
      millis = QUARTER
      break
    case "y":
    case "yr":
    case "yrs":
    case "year":
    case "years":
      // leap years...
      millis = YEAR
      break
    default:
      throw new Error("Unrecognized time unit: " + unit)
  }

  return millis
}