# minkelite

The Database and Statistical Model for Time-series Data Analytics

# HTTP API

## PARAMETERS

- `act` : account key specified by the user in the config option set at init time of
tracer such as "wfp:helloworld".  It is used in the URL when the user goes to
the dashboard like: http://localhost:8103/dash/wfp:helloworld
- `host` : host name such as Demo.local in
http://localhost:8103/dash/wfp:helloworld/Demo.local/9366
- `pid` : process ID such as 9366 in
http://localhost:8103/dash/wfp:helloworld/Demo.local/9366
- `pfkey` : profile key which is unique identifier of trace file.  Trace file is
self contained and generated one per arechiveInterval per host per process.
See the example /get_raw_pieces below.
- `version` : (for post_raw_pieces only) Tracer version string such as 1.2.12 
three numbers separated by a period.

## COMMANDS
###`/get_host_pid_list/:act`
**usage**: create the pulldown menu of HOST and PID shown at top right corner of
	the dashboard.  Returns a list of all host names and pids per host for
	the specific act


**arguments**: act


**example**: http://localhost:8103/get_host_pid_list/wfp:helloworld

###`/get_meta_transactions/:act/:host/:pid`
**usage**: get a list of all transactions for specific act, host, pid  It is used
	when the dashboard first displays the transaction history.  The input


**arguments**: act, host, and pid are returned by get_host_pid_list


**example**: http://localhost:8103/get_meta_transactions/wfp:helloworld/
	Demo.local/3603

###`/get_transaction/:act/:transaction/:host/:pid`
**usage**: get a series of data and pfkey for the specific transaction,act,host,pid


**example**: http://localhost:8103/get_transaction/wfp:helloworld/
	serve%20GET%20%2Fghost/Demo.local/3603

###`/get_raw_memory_pieces/:act/:host/:pid`
**usage**: get a series of process heap total, heap used, rss, loadaverage, uptime
	and pfkey for the specific act, host, pid  Used to draw the first two line
	charts


**example**: http://localhost:8103/get_raw_memory_pieces/wfp:helloworld/
	Demo.local/3603

###`/get_raw_pieces/:pfkey`
**usage**: retrieve the trace file of specific host and pid at specific time  Used
	to draw flame graph and waterfall views


**example**: http://localhosts:8103/get_raw_pieces/
	f7e15f59f8c3d22115685dd90f56446a%7Cdb0fe07ce9c69159abccf7d79deb2c13

###`/post_raw_pieces/:version`
**usage**: post gzipped trace JSON file to minkelite request.body should be the
	gzipped trace


**example**: http://cxlite.concurix.com:8103/post_raw_pieces/1.1.12


# JS API
### ml.getHostPidList(act, callback)
Gets a list of hosts and process IDs of the account
- `act` {String} same as HTTP API parameter: act
- `callback` {Function} Calleld with an object

### ml.getMetaTransactions(act, host, pid, callback)
Gets data to visualize the list of transactions on the transaction
- `act` {String} same as HTTP API parameter: act
- `host` {String} same as HTTP API parameter: host
- `pid` {Integer} same as HTTP API parameter: pid
- `callback` {Function} Called with an object and a callback function which must
	be called with the returned object for cleanup

### ml.getTransaction(act, tran, host, pid, callback)
Returns data to visualize the historical chart of the specific
	transaction
- `act` {String} same as HTTP API parameter: act
- `tran` {String} typically one of the transactions acquired by getMetaTransactions
- `host` {String} same as HTTP API parameter: host
- `pid` {Integer} same as HTTP API parameter: pid
- `callback` {Function} Called with an object

### ml.getRawMemoryPieces(act, host, pid, callback)
Gets data to visualize the timeline view on the dashboard
- `act` {String} same as HTTP API parameter: act
- `host` {String} same as HTTP API parameter: host
- `pid` {Integer} same as HTTP API parameter: pid
- `callback` {Function} Called with an object

### ml.getRawPieces(pfkey, uncompress, callback)
Gets a trace file JSON as a string
- `pfkey` {String}
- `uncompress` {Boolean} true if client wants
- `callback` {Function} Calleld with string of trace JSON

### ml.postRawPieces(version, act, trace, callback)
Puts trace data to MinkeLite DB and returns {Boolean} where true = the post request succeeded
- `version` {String} tracer version such as "1.2.2"
- `act` {String} same as HTTP API parameter: act
- `trace` {Object} trace JSON object
- `callback` {Function} Calleld with {Boolean} where false = the post request succeeded

### ml.getExpressApp()
Returns an Express app of the MinkeLite instance.  Clients should start it.

### ml.startServer()
Starts the Express app of the MinkeLite instance

### ml.shutdown(callback)
Shutdown the handles created for the MinkeLite instance
- `callback` {Function} Called with error
