2016-05-06, Version 2.0.7
=========================

 * update copyright notices and license (Ryan Graham)


2016-05-04, Version 2.0.6
=========================

 * package: do not strip test servers (Sam Roberts)


2016-04-11, Version 2.0.5
=========================

 * Refer to licenses with a link (Sam Roberts)


2015-10-05, Version 2.0.4
=========================

 * Use strongloop conventions for licensing (Sam Roberts)


2015-09-16, Version 2.0.3
=========================

 * syslog: replace node-syslog with modern-syslog (Sam Roberts)


2015-02-11, Version 2.0.2
=========================

 * Fix timestamps in log backend (Ryan Graham)


2015-01-12, Version 2.0.1
=========================

 * Fix bad CLA URL in CONTRIBUTING.md (Ryan Graham)


2014-12-15, Version 2.0.0
=========================

 * fix syslog test plan (Sam Roberts)

 * Use cluster IPC, not UDP, to send stats to master (Sam Roberts)


2014-12-05, Version 1.1.1
=========================

 * package: fix syslog docs (`,` should be `&`) (Sam Roberts)

 * test: replace tap fork with upstream (Ryan Graham)

 * syslog: replace node-syslog with strong-fork-syslog (Ryan Graham)


2014-12-01, Version 1.1.0
=========================

 * Use relative backend names, the logs are cleaner (Sam Roberts)

 * test: server APIs made more uniform (Sam Roberts)

 * test: syslog server has addon dependency injected (Sam Roberts)

 * syslog: add debug logging of messages (Sam Roberts)

 * Error if no backends, or multiple backends. (Sam Roberts)

 * test: add unref() to graphite server (Sam Roberts)

 * internal: use javascript milliseconds since epoc (Sam Roberts)

 * syslog: node-syslog dependency is now injected (Sam Roberts)

 * syslog: reimplement as a backend (Sam Roberts)

 * Add copyright header to lib/log.js (Sam Roberts)

 * internal-statsd: reimplement worker/master statsd (Sam Roberts)

 * test: refactor into reuseable test servers (Sam Roberts)

 * Fix incomplete rewrite during rebase (Sam Roberts)

 * statsd: use the repeater to forward metrics (Sam Roberts)

 * splunk: support checking of splunk host name (Sam Roberts)

 * Support async checking of backends (Sam Roberts)

 * Direct use of statsd, not through child process (Sam Roberts)

 * Import core etsty/statsd code (Sam Roberts)

 * Add strongloop copyright headers (Sam Roberts)


2014-11-14, Version 1.0.0
=========================

 * package: mark version as -initial (Sam Roberts)

 * internal: work around UPD message ordering (Sam Roberts)

 * test: add test for negative gauge values (Sam Roberts)

 * statsd: support a configurable flush interval (Sam Roberts)

 * internal: emit metrics internally from the backend (Sam Roberts)

 * package: node-syslog dependency is optional (Ryan Graham)

 * statsd: set server url on start (Sam Roberts)

 * test: only report PASS if exit code is OK (Sam Roberts)

 * Support log: URL, to log metrics to file or stdout (Sam Roberts)

 * Rename console backend to debug (Sam Roberts)

 * Throw on error specifying the backend. (Sam Roberts)

 * package: increment version to 1.0.0 for staging (Sam Roberts)

 * Keep child refed until it has started (Sam Roberts)

 * Console color option now controls prettyprinting (Sam Roberts)

 * Support statsd:// URL, and sending metrics (Sam Roberts)

 * test: check that statsd is unrefed (Sam Roberts)

 * Start a statsd daemon, configured via URL (Sam Roberts)

 * Initial package (Sam Roberts)


2014-10-03, Version INITIAL
===========================

 * First release!
