2015-01-21, Version 1.3.9
=========================

 * Remove HttpDuplex from Service prototype (Ryan Graham)


2015-01-13, Version 1.3.8
=========================



2015-01-13, Version 1.3.7
=========================

 * Describe fork in README (Ryan Graham)

 * Use 'git service' instead of 'git-service' (Ryan Graham)

 * tests: use cross-platform tmpdir (Ryan Graham)

 * tests: use 127.0.0.1 instead of localhost (Ryan Graham)

 * test: improve reject test wording (Ryan Graham)

 * fix repo name in tests (Ryan Graham)

 * test: fix path/fs.exists reference (Ryan Graham)

 * travis: update node versions (Ryan Graham)

 * Use 'git command' instead of 'git-command' (Ryan Graham)

 * Fork as strong-fork-pushover (Ryan Graham)


2014-05-17, Version 1.3.6
=========================

 * self (James Halliday)


2014-04-22, Version 1.3.5
=========================

 * print errors in the reject test (James Halliday)

 * wrap spawn calls in better error reporting (James Halliday)

 * inherits package instead (James Halliday)

 * indent (Maks Nemisj)

 * s/\t/\s/g (Maks Nemisj)

 * Added gzip decoding when git fetches pack using gzip compression (Maks Nemisj)

 * add done callback and document the response event (Max Ogden)

 * add response stream for controlling what gets written to the git client response (Max Ogden)


2013-12-11, Version 1.3.4
=========================

 * Using util.inherits instead of new EventEmitter and calling contstructor. Otherwise multiple pushover instances uses one EventEmitter instance (maksn)


2013-04-07, Version 1.3.3
=========================

 * add back http-duplex into service responses (James Halliday)

 * update the dirmap test to work with auto .git inclusion (James Halliday)

 * Corrected port number in example (Maximilian Antoni)


2013-04-06, Version 1.3.2
=========================

 * using a regex instead of substr (James Halliday)

 * Repo name: If repo does not end with .git - then add .git to the repo name (Duncan Angus Wilkie (mrdnk))


2013-04-06, Version 1.3.1
=========================

 * `connection: close` fixes everything; 1.3.1 (James Halliday)


2013-04-05, Version 1.3.0
=========================

 * use .once() (James Halliday)

 * using through in lib/service to get proper backpressure (James Halliday)

 * pipe stdout directly through instead of using a custom onexit handler (James Halliday)

 * readme art (James Halliday)


2013-02-04, Version 1.2.1
=========================

 * fix for some repos that just send 0000 on push-receive for some reason (James Halliday)


2012-12-21, Version 1.2.0
=========================

 * document dirmap (James Halliday)

 * dirmap test finally passes; thread the functionality through repos(dirmap) instead (James Halliday)

 * failing dirmap test (James Halliday)


2012-12-12, Version 1.1.1
=========================

 * fix race condition resulting in lost chunks and hanging git pushes (James Halliday)

 * Fix upload-pack regex (Zeus)


2012-10-14, Version 1.1.0
=========================

 * node_modules should never be in .gitignore (James Halliday)

 * emit multiple events if commits and tags are pushed (Julian Gruber)

 * handle tags (Julian Gruber)


2012-09-26, Version 1.0.3
=========================

 * Fix crash on some requests. (Hugh Kennedy)


2012-09-23, Version 1.0.2
=========================

 * make missing directories in create() (James Halliday)


2012-09-22, Version 1.0.1
=========================

 * subdirs work (James Halliday)

 * failing test for subdirs (James Halliday)


2012-09-22, Version 1.0.0
=========================

 * s/qs/querystring/ (James Halliday)

 * update readme, example with all the new events (James Halliday)

 * add cwd and repo to info and head duplex event objects (James Halliday)

 * head events (James Halliday)

 * info requests split out into a separate lib file (James Halliday)

 * info events, first half (James Halliday)

 * all tests pass again, "fetch" event (James Halliday)

 * reject test passes with the new accept/reject event api (James Halliday)

 * fix test to compensate for repos.create() (James Halliday)

 * refactor service handling logic into lib/service.js, launch the command after emitting and parsing the values (James Halliday)

 * make sure the reject test directory never gets created, currently fails (James Halliday)

 * remove repos.listen() (James Halliday)

 * split up big file into some littler files (James Halliday)

 * fix so all tests pass again (James Halliday)

 * passing reject test (James Halliday)

 * switched over to http-duplex api (James Halliday)

 * update tests for http-duplex usage (James Halliday)

 * passing the new tests (James Halliday)

 * updated tests for new push signature (James Halliday)


2012-08-14, Version 0.1.6
=========================

 * 0.1.6, document branch argument to push event (James Halliday)

 * push emits branch, passes branch test (James Halliday)

 * failing test to get branch data (James Halliday)


2012-08-13, Version 0.1.5
=========================

 * fs.exists (James Halliday)

 * documented "push", repo, commit (James Halliday)

 * emit the commit hash as the second arg, passes its test (James Halliday)

 * failing test to check the commit hash as the second arg from "push" events (James Halliday)


2012-07-22, Version 0.1.4
=========================

 * fix all the race conditions (James Halliday)

 * fix race condition in node 0.8. due to "exit"/end event ordering (James Halliday)


2012-07-07, Version 0.1.3
=========================

 * seq is still a dev dep (James Halliday)

 * fs.exists (James Halliday)

 * remove unnecessary dep, bump travis to 0.8 (James Halliday)

 * travis badge (James Halliday)


2012-02-28, Version 0.1.2
=========================

 * bump and using travis (James Halliday)

 * Bubble up listening event to pushover. (Daniel D. Shaw)


2012-01-14, Version 0.1.1
=========================

 * bump for opts.checkout (James Halliday)

 * minor style changes (James Halliday)

 * self not defined (James Halliday)

 * Add option to work with checkouts rather than bare repos. (Mikeal Rogers)


2011-11-23, Version 0.1.0
=========================



2011-11-23, Version 0.0.1
=========================

 * readme notes and a bump for autocreate (James Halliday)

 * autoCreate test passes (James Halliday)

 * create() is async, check for autoCreate option (James Halliday)

 * handle now ensures the repository exists and creates a bare one if required. Effectively removes the need for explicit create call (Mark Lussier)


2011-11-17, Version 0.0.0
=========================

 * First release!
