2015-10-01, Version 1.2.5
=========================

 * Use strongloop conventions for licensing (Sam Roberts)


2015-09-12, Version 1.2.4
=========================

 * ensure tarballs aren't included in publish (Ryan Graham)

 * deps: use official sqlite3 release (Ryan Graham)

 * deps: depend on node-sqlite3 from git (Ryan Graham)

 * Enable unit test code coverage report generation (Tetsuo Seto)


2015-08-26, Version 1.2.3
=========================



2015-08-21, Version 1.2.2
=========================

 * Make Minkelite more robust for multi client use. (Tetsuo Seto)

 * deps: upgrade MD5@1 to md5@2 (Ryan Graham)

 * Check the major version only for supported tracer versions (Setogit)


2015-07-27, Version 1.2.1
=========================

 * add 1.3 to supported tracer version (Setogit)


2015-07-27, Version 1.2.0
=========================

 * Agent probe: support oracledb by Oracle (Setogit)


2015-07-06, Version 1.1.2
=========================

 * check if db is being initialized (Setogit)


2015-06-03, Version 1.1.1
=========================



2015-06-03, Version 1.1.0
=========================

 * remove the debug statement because it has little value and pfkey is undefined. (Setogit)

 * Emit sqlite3 errors on Minkelite (Sam Roberts)

 * Remove unnecessary conversion of null to false (Sam Roberts)

 * Whitespace cleanup, wrapping and code consistency (Sam Roberts)

 * Implement minkelite parameters for v1 release (Setogit)

 * Add .gitignore file (Sam Roberts)


2015-05-21, Version 1.0.1
=========================

 * Use debug instead of home-grown debug log (Sam Roberts)

 * Remove trailing whitespace (Sam Roberts)

 * sort pids in getHostPidList payload (Setogit)

 * deps: upgrade to sqlite3 v3.0.6 (Ben Noordhuis)

 * disable stats builder if interval is zero edison support in strongloop environment (Setogit)

 * edison support in strongloop environment (Setogit)

 * group DB transactions per DB and sort them (Setogit)

 * use callback for shutdown (Ryan Graham)

 * emit 'ready' when DB has been fully initialized (Ryan Graham)


2015-04-01, Version 1.0.0
=========================

 * Add standard StrongLoop boilerplate to all renamed Concurix repos (Setogit)

 * support tracer version 1.2 (Setogit)

 * Add JS API to MikeLite (Setogit)


2015-02-24, Version 0.1.11
==========================

 * fix typo bug (Setogit)


2015-01-13, Version 0.1.10
==========================

 * edison support (Setogit)


2014-12-31, Version 0.1.9
=========================

 * update timestamp only if it's  out-of sync (Setogit)


2014-12-23, Version 0.1.8
=========================

 * use the current time as timestapm for arch=ia32 (Setogit)


2014-12-17, Version 0.1.7
=========================

 * do not limit transactions per transaction type (Setogit)


2014-12-15, Version 0.1.6
=========================

 * fit sorting (Setogit)


2014-12-12, Version 0.1.5
=========================

 * fix duplicate primary key issue, cleanup db serialization, and cleanup meta transaction string alloc/dalloc (Setogit)


2014-12-09, Version 0.1.4
=========================

 * more precise pfkey (Setogit)


2014-12-08, Version 0.1.3
=========================

 * ignore patch version (Setogit)

 * use right vartiable name (Setogit)

 * better fix to empty transaction history bug (Setogit)


2014-12-02, Version 0.1.2
=========================

 * fix empty transaction time (Setogit)


2014-11-04, Version 0.1.1
=========================

 * no pruning when stale_minute==0 (Setogit)


2014-11-02, Version 0.1.0
=========================

 * First release!
