'use strict'

/*

Protocol between Minkelite and Tracer on Trace File Versioning

1. When Tracer makes a breaking change to the trace file format, it bumps up
 the major version of the package.  Tarcer developer an Minkelite developer
 work together and implement the new format on both side.  Currently,
 Minkelite supports Trace File Version 1 only and rejects others.

2. Tracer can change minor or patch version of the package as far as it does
 not impact Trace file format.  It's safe to add new fields to the trace file
 as long as the existing fields and their semantics don't change.  Minkelite
 stores the trace file as a whole with the new fields (postRawPieces API)
 and the trace file can be read afterwards (getRawPieces API).

 */

/*

Debugging minkelite with config.sqlite3_verbose:true  (derfault: false)

By setting sqlite3_verbose to true, minkelite initializes Sqlite3 with
verbose mode on.  Client can listen on 'trace' or 'profile' events to
monitor the minkelite transactions:

  this.db.on('trace', function(sql){
    console.log('----- on trace:', sql)
  })

  this.db.on('profile', function(sql, msec){
    console.log('----- on profile:', sql, msec, 'ms.')
  })

 */

module.exports = MinkeLite

var CONFIG_JSON = require('./minkelite_config.json')
var EventEmitter = require('events').EventEmitter
var ago = require("ago")
var async = require("async")
var bodyParser = require('body-parser')
var debug = require('debug')('minkelite');
var express = require('express')
var fs = require("fs")
var md5 = require('md5')
var sqlite3 = require("sqlite3")
var statslite = require("stats-lite")
var util = require('util')
var xtend = require('xtend')
var zlib = require('zlib')

// XXX(sam) these variable names are longer and more obscure than the literal
// value they represent
var $$$ = '|'
var $$_ = '!'
var DISABLE_VERBOSE_MODE = true
var EXTRA_WRITE_COUNT_IN_DEVMODE = 0
var LIMIT_TRANSACTION_INSTANCES = false
var MINIMUM_SEGMENT_DURATION = 2
var MIN_DATA_POINTS_REQUIRED_FOR_MODELING = 20
var SUPPORTED_TRACER_VERSIONS = ["1."]
var SUPRESS_NOISY_WATERFALL_SEGMENTS = false
var TRACE_NOT_FOUND_GZIPPED = null

zlib.gzip("The trace file not found.", function(err, buf) {
  TRACE_NOT_FOUND_GZIPPED = buf
})

var SYSTEM_TABLES = {
  "system_tables":[
    {
      "name": "raw_trace",
      "columns": "pfkey TEXT PRIMARY KEY, ts INTEGER, trace BLOB"
    }
    ,{
      "name": "raw_memory_pieces",
      "columns": "pfkey TEXT PRIMARY KEY, ts INTEGER, act TEXT, host TEXT, pid INTEGER, lm_a INTEGER, p_mr INTEGER, p_mt INTEGER, p_mu INTEGER, p_ut REAL, s_la REAL"
    }
    ,{
      "name": "meta_transactions",
      "columns": "act_hour_host_pid TEXT PRIMARY KEY, ts INTEGER, act TEXT, hour INTEGER, host TEXT, pid INTEGER, trans BLOB"
    }
    ,{
      "name": "meta_custom_transactions",
      "columns": "act_hour_host_pid TEXT PRIMARY KEY, ts INTEGER, act TEXT, hour INTEGER, host TEXT, pid INTEGER, trans BLOB"
    }
    ,{
      "name": "raw_transactions",
      "columns": "act_tran_ts_host_pid TEXT PRIMARY KEY, pfkey TEXT, tran TEXT, ts INTEGER, act TEXT, host TEXT, pid INTEGER, lm_a INTEGER, max INTEGER, mean REAL, min INTEGER, n INTEGER, sd REAL"
    }
    ,{
      "name": "raw_custom_transactions",
      "columns": "act_tran_ts_host_pid TEXT PRIMARY KEY, pfkey TEXT, tran TEXT, ts INTEGER, act TEXT, host TEXT, pid INTEGER, lm_a INTEGER, max INTEGER, mean REAL, min INTEGER, n INTEGER, sd REAL"
    }
    ,{
      "name": "model_mean_sd",
      "columns": "act_host_pid TEXT PRIMARY KEY, ts INTEGER, p_mu_mean REAL, p_mu_sd REAL, s_la_mean REAL, s_la_sd REAL"
    }
  ]
}

function MinkeLite(config) {
  if (!(this instanceof MinkeLite)) return new MinkeLite(config)
  EventEmitter.call(this)
  var MY_CONFIG = config ? xtend(SYSTEM_TABLES, config) : SYSTEM_TABLES
  this.config = xtend(MY_CONFIG, CONFIG_JSON)

  if( this.config.dev_mode==null ) this.config.dev_mode = false
  if( this.config.in_memory==null ) this.config.in_memory = true

  this.config.dir_path = this.config.dir_path || "./"
  this.config.db_name = this.config.in_memory ? ":memory:" : (
    this.config.db_name || '' );

  if( this.config.sqlite3_verbose )
    sqlite3 = sqlite3.verbose();
  if( this.config.stale_minutes==null )
    this.config.stale_minutes = 1*24*60
  if( this.config.chart_minutes==null )
    this.config.chart_minutes = 1*24*60
  if( this.config.pruning_interval_seconds==null )
    this.config.pruning_interval_seconds = 10*60
  if( this.config.start_server==null )
    this.config.start_server = false
  if( this.config.server_port==null )
    this.config.server_port = 8103
  if( this.config.max_transaction_count==null )
    this.config.max_transaction_count = 20
  if( this.config.stats_interval_seconds==null )
    this.config.stats_interval_seconds = 10*60
  if( this.config.compress_trace_file==null )
    this.config.compress_trace_file = true

  // XXX(sam) Initialization below is async, and can fail.
  this._init_db()
  this._init_server()

  this.pruner = null;
  if (this.config.pruning_interval_seconds > 0 && this.config.stale_minutes > 0)
    this.pruner = setInterval(deleteAllStaleRecords.bind(this),
                this.config.pruning_interval_seconds*1000)
  this.model_builder = null;
  if (this.config.stats_interval_seconds > 0)
    this.model_builder = setInterval(buildStats.bind(this), this.config.stats_interval_seconds*1000)
  debug('config:', this.config)
}

util.inherits(MinkeLite, EventEmitter)

MinkeLite.prototype.shutdown = function (cb) {
  // exitIfNotReady(this, "shutdown")
  if (this.pruner) {
    clearInterval(this.pruner)
    this.pruner = null
  }
  if (this.model_builder) {
    clearInterval(this.model_builder)
    this.model_builder = null
  }
  var tasks = [];
  if (this.express_server) {
    tasks.push(this.express_server.close.bind(this.express_server))
  }
  if (this.db) {
    tasks.push(this.db.close.bind(this.db))
  }
  this.db = null
  this.express_server = null
  async.series(tasks, cb)
}

MinkeLite.prototype.get_express_app = function () {
  return this.express_app
}

MinkeLite.prototype.getExpressApp = function () {
  return this.express_app
}

MinkeLite.prototype.startServer = function () {
  this.express_server = this.express_app.listen(this.config.server_port)
}

MinkeLite.prototype._init_db = function () {
  this.db_being_initialized = false
  this.db_path = this.config.in_memory ? this.config.db_name :
    this.config.db_name=='' ? '' : this.config.dir_path+this.config.db_name
  this.db_exists = this.config.in_memory ?
    false :
    fs.existsSync(this.db_path)

  if(this.db_exists && this.config.overwrite) {
    try{fs.unlinkSync(this.db_path);} catch(e){}
    this.db_exists = false;
  }

  debug('db open: path %j pre-existing? %j', this.db_path, this.db_exists);

  this.db = new sqlite3.Database(this.db_path,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
  this.db.on('error', this.emit.bind(this, 'error'));

  if (this.db_exists) {
    this.db.on('open', this.emit.bind(this, 'ready'))
    return
  }
  this.db_being_initialized = true
  var self = this;
  this.db.on('open', function() {
    async.each(self.config.system_tables, function(tbl, next) {
      var query = util.format("CREATE TABLE %s (%s) WITHOUT ROWID",
        tbl.name, tbl.columns)
      self.db.run(query, function(err) {
        debug('init: %s => %j', query, err);
        next(err)
      });
    }, function(err) {
      self.db_being_initialized = false
      if (err)
        self.emit('error', err) // FIXME(sam) pm must listen for this
      else {
        self.emit('ready')
        self.db_exists = true
      }
    })
  });
}

MinkeLite.prototype._init_server = function () {
  if (!this.config.start_server) {
    this.express_server = null;
    return;
  }
  var jsonParser = bodyParser.json({limit:100000000})
  this.express_app = express()
    .post("/post_raw_pieces/:version", jsonParser,
      function(req,res){postRawPiecesRoute(this,req,res)}.bind(this))
    .post("/results/:version", jsonParser,
      function(req,res){postRawPiecesRoute(this,req,res)}.bind(this))
    .get("/get_raw_pieces/:pfkey",
      function(req,res){getRawPiecesRoute(this,req,res)}.bind(this))
    .get("/get_raw_memory_pieces/:act/:host/:pid",
      function(req,res){getRawMemoryPiecesRoute(this,req,res)}.bind(this))
    .get("/get_meta_transactions/:act/:host/:pid",
      function(req,res){getMetaTransactionsRoute(this,req,res)}.bind(this))
    .get("/get_transaction/:act/:transaction/:host/:pid",
      function(req,res){getTransactionRoute(this,req,res)}.bind(this))
    .get("/get_host_pid_list/:act",
      function(req,res){getHostPidListRoute(this,req,res)}.bind(this));
  this.express_server = this.express_app.listen(
      this.config.server_port, function() {
        debug("MinkeLite is listening on " + this.config.server_port)
      }.bind(this)) // XXX(sam) remove bind, use this.address()
}

function sendCompressedTrace(traceCompressed, self, res) {
  var trace = TRACE_NOT_FOUND_GZIPPED
  if (traceCompressed) {
    trace = traceCompressed
  }
  writeHeaderJSON(res)
  res.write(trace)
  res.end()
}

function sendUncompressedTrace(traceCompressed, self, res){
  if (traceCompressed) {
    zlib.unzip(traceCompressed, function(zlibErr, buf) {
      // FIXME zlibErr is unhandled
      var traceStr = buf.toString('utf-8');
      writeHeaderJSON(res, false)
      res.write(traceStr)
      res.end()
    })
  } else {
    writeHeaderJSON(res, false)
    res.write("The trace file not found.")
    res.end()
  }
}

function getRawPiecesRoute(self,req,res){
  // "/get_raw_pieces/:pfkey"
  var pfkey = decodeURIComponent(req.params.pfkey)

  self.getRawPieces(pfkey, false, function(traceCompressed){
    var sendCallback = self.config.compress_trace_file ?
      sendCompressedTrace : sendUncompressedTrace
    sendCallback(traceCompressed,self,res)
  })
}

MinkeLite.prototype.getRawPieces = function (pfkey, uncompress, callback) {
  // "/get_raw_pieces/:pfkey"
  // callback gets a string of either gzip compressed or uncompressed trace JSON
  if(this.db_being_initialized){
    callback(null)
    return
  }
  debug("get_raw_pieces called with uncompress %j for pfkey %j",
        uncompress, pfkey)
  var query = util.format("SELECT trace FROM raw_trace WHERE pfkey='%s'", pfkey)
  this.db.get(query, function(err, row) {
    if (err) {
      debug('query %s => %j', query, err);
      return callback(null);
    }
    var traceCompressed = (row && row.trace) ? row.trace : null
    if(traceCompressed == null) {
      debug('query %s => no row.trace', query);
      return callback(null);
    }
    if (uncompress) {
      zlib.unzip(traceCompressed, function(zlibErr, buf) {
        if (zlibErr) {
          callback(null)
        } else {
          var traceStr = buf.toString('utf-8');
          callback(traceStr)
        }
      })
    } else {
      callback(traceCompressed)
    }
  })
}

function getHostPidListRoute(self,req,res){
  // "/get_host_pid_list/:act
  var act = decodeURIComponent(req.params.act)
  self.getHostPidList(act, function(traceObject) {
    zipAndRespond(traceObject,res)
  })
}

MinkeLite.prototype.getHostPidList = function (act,callback){
  // "/get_host_pid_list/:act
  // callback gets the DATA object
  if(this.db_being_initialized){
    callback(null)
    return
  }
  var self = this
  debug("get_host_pid_list called for act:",act)
  var db = this.db
  var DATA = {}
  DATA["act"] = act
  DATA["hosts"] = []

  function getRowsHostPidList(err, rows){
    if (err) {
      console.log("ERROR:",err)
    }
    else if (rows) {
      var hosts = DATA["hosts"]
      for (var i in rows){
        var row = rows[i]
        var unknownHost = true
        for(var k in hosts){
          if( hosts[k]["host"]==row.host ){
            hosts[k]["pids"].push(row.pid)
            unknownHost = false
            break
          }
        }
        if (unknownHost) {
          hosts.push({
            "host": row.host,
            "pids": [row.pid]
          })
        }
      }
      debug("SELECT host,pid FROM raw_memory_pieces for act :", act, "... done.")
      for(var k in DATA["hosts"]){
        DATA["hosts"][k]["pids"].sort()
      }
      callback(DATA)
    }
  }

  var chartTime = ago(self.config.chart_minutes, "minutes").toString()
  var query = util.format(
    "SELECT DISTINCT host,pid FROM (SELECT host,pid FROM raw_memory_pieces WHERE act='%s' AND ts > %s)",
    act, chartTime)

  db.all(query, getRowsHostPidList)
}

function getRawMemoryPiecesRoute(self,req,res){
  // "/get_raw_memory_pieces/:act/:host/:pid"
  var act = decodeURIComponent(req.params.act)
  var host = decodeURIComponent(req.params.host)
  var pid = parseInteger(decodeURIComponent(req.params.pid))

  self.getRawMemoryPieces(act, host, pid, function(traceObject) {
    zipAndRespond(traceObject,res)
  })
}

MinkeLite.prototype.getRawMemoryPieces = function (act,host,pid,callback){
  // "/get_raw_memory_pieces/:act/:host/:pid"
  // callback gets the DATA object
  if(this.db_being_initialized){
    callback(null)
    return
  }
  var self = this
  debug("get_raw_memory_pieces called for act:",act,"host:",host,"pid:",pid)
  var db = self.db
  var DATA = {}
  DATA["act"] = act
  DATA["hosts"] = {}

  function getRowsRawMemoryPieces(err, rows){
    if (err) {
      console.log("ERROR:",err)
    }
    else if (rows) {
      for (var i in rows) {
        var row = rows[i]
        var data = {}
        data["pfkey"] = row.pfkey
        data["ts"] = getDateTimeStr(row.ts)
        data["p_mr"] = row.p_mr
        data["p_mt"] = row.p_mt
        data["p_mu"] = row.p_mu
        data["p_ut"] = row.p_ut
        data["s_la"] = row.s_la
        data["lm_a"] = row.lm_a
        if(!(row.host in DATA["hosts"]))
          DATA["hosts"][row.host] = {}
        if(!(row.pid in DATA["hosts"][row.host]))
          DATA["hosts"][row.host][row.pid] = []
        DATA["hosts"][row.host][row.pid].push(data)
      }
      for (var host in DATA["hosts"]) {
        for (var pid in DATA["hosts"][host]) {
          DATA["hosts"][host][pid].sort(function(x,y){
            if( x.ts<y.ts ) return -1
            if( x.ts>y.ts ) return 1
            return 0
          })
        }
      }
      debug("SELECT FROM raw_memory_pieces for act :", act, "... done.")
      callback(DATA)
    }
  }

  var chartTime = ago(self.config.chart_minutes, "minutes").toString()
  var query = null
  var baseQuery1 = util.format(
    "SELECT pfkey,ts,host,pid,p_mr,p_mt,p_mu,p_ut,s_la,lm_a FROM raw_memory_pieces WHERE act='%s' AND ts > %s ",
    act, chartTime)
  var baseQuery2 = "ORDER BY ts"
  if (host.length>0 && host!="0" && pid>0 ) {
    var querySpecificHostPid = baseQuery1+"AND host='%s' AND pid=%s "+baseQuery2
    query = util.format(querySpecificHostPid, host, pid.toString())
  } else if (host.length>0 && host!="0" && pid==0 ) {
    var querySpecificHost = baseQuery1+"AND host='%s' "+baseQuery2
    query = util.format(querySpecificHost, host)
  } else if ((host.length==0 || host=="0") && pid>0 ) {
    var querySpecificPid = baseQuery1+"AND pid=%s "+baseQuery2
    query = util.format(querySpecificPid, pid.toString())
  } else {
    query = baseQuery1+baseQuery2
  }
  db.all(query,getRowsRawMemoryPieces)
}

function getMetaTransactionsRoute(self,req,res){
  // "/get_meta_transactions/:act/:host/:pid"
  var act = decodeURIComponent(req.params.act)
  var host = decodeURIComponent(req.params.host)
  var pid = parseInteger(decodeURIComponent(req.params.pid))
  self.getMetaTransactions(act,host,pid,function(traceObject,callback){
    zipAndRespond(traceObject,res)
    callback(traceObject)
  })
}

MinkeLite.prototype._sort_db_transactions = function (transArray) {
  // Memcached must be listed before Mechcache.
  // Oracledb must be listed before Oracle.
  var re = /^(Memcached|Memcache|MongoDB|MySQL|Oracledb|Oracle|PostgreSQL|Redis)/;
  transArray.sort(function(a,b){
    var aa = (re.exec(a[0])||'')[0]||''
    var bb = (re.exec(b[0])||'')[0]||''
    return (aa<bb) ? -1 : ((aa>bb) ? 1 : (a[1]<b[1] ? 1 : (a[1]>b[1] ? -1 : 0)))
  });
}

MinkeLite.prototype.getMetaTransactions = function (act,host,pid,callback){
  // "/get_meta_transactions/:act/:host/:pid"
  // callback gets the DATA object and callback which must be called with DATA when done with DATA
  if(this.db_being_initialized){
    callback(null,null)
    return
  }
  var self = this
  debug("get_meta_transactions called for act:",act,"host:",host,"pid:",pid)
  var db = self.db
  var DATA = {}
  var edison = isEdison(act)
  DATA["act"] = act
  DATA["hosts"] = {}

  function getRowsMetaTransactions(err, rows){
    if (err){console.log("ERROR:",err)}
    else if ( rows ){
      for (var i in rows){
        var row = rows[i]
        if(!(row.host in DATA["hosts"])) DATA["hosts"][row.host] = {}
        if(!(row.pid in DATA["hosts"][row.host])) DATA["hosts"][row.host][row.pid] = []
        var transArray = decomposeTransBlob(row.trans)
        sortTransArray(transArray, edison)
        var maxTransCount = Math.min(transArray.length,self.config.max_transaction_count)
        for (var k=0; k<maxTransCount; k++){
          var tran = transArray[k][0]
          var value = transArray[k][1]
          var transArrayInDATA = DATA["hosts"][row.host][row.pid]
          if( ! isInTransArray(tran,value,transArrayInDATA) ) transArrayInDATA.push([tran,value])
        }
        freeTransArray(transArray)
      }
      for(var host in DATA["hosts"]){
        for(var pid in DATA["hosts"][host]){
          var transArrayInDATA = DATA["hosts"][host][pid]
          sortTransArray(transArrayInDATA, edison)
          var maxTransCount = Math.min(transArrayInDATA.length,self.config.max_transaction_count)
          var trash = transArrayInDATA.splice(maxTransCount)
          for(var i in trash){ delete trash[i][0] }
          if (!edison) self._sort_db_transactions(transArrayInDATA)
          for(var i in transArrayInDATA){transArrayInDATA[i] = transArrayInDATA[i][0]}
        }
      }
      debug("SELECT FROM meta tarnsactions for act :", act, "... done.")
      callback(DATA,freeTransStrings)
    }
  }

  var chartTime = ago(self.config.chart_minutes, "minutes").toString()
  var query = null
  var tableName = isEdison(act) ? "meta_custom_transactions":"meta_transactions"
  var baseQuery = util.format("SELECT host,pid,trans FROM %s WHERE act='%s' AND ts > %s", tableName, act, chartTime)
  if ( host.length>0 && host!="0" && pid>0 ) {
    var querySpecificHostPid = baseQuery+" AND host='%s' AND pid=%s"
    query = util.format(querySpecificHostPid, host, pid.toString())
  } else if ( host.length>0 && host!="0" && pid==0 ) {
    var querySpecificHost = baseQuery+" AND host='%s'"
    query = util.format(querySpecificHost, host)
  } else if ( (host.length==0 || host=="0") && pid>0 ) {
    var querySpecificPid = baseQuery+" AND pid=%s"
    query = util.format(querySpecificPid, pid.toString())
  } else {
    query = baseQuery
  }
  db.all(query,getRowsMetaTransactions)
}

function getTransactionRoute(self,req,res){
  // "/get_transaction/:act/:transaction/:host/:pid"
  var act = decodeURIComponent(req.params.act)
  var tran = req.params.transaction
  var host = decodeURIComponent(req.params.host)
  var pid = parseInteger(decodeURIComponent(req.params.pid))
  self.getTransaction(act,tran,host,pid,function(traceObject){zipAndRespond(traceObject,res)})
}

MinkeLite.prototype.getTransaction = function (act,tran,host,pid,callback){
  // "/get_transaction/:act/:transaction/:host/:pid"
  // callback gets the DATA object
  if(this.db_being_initialized){
    callback(null)
    return
  }
  var self = this
  debug("get_transaction called for act:",act,"host:",host,"pid:",pid)
  var db = self.db
  var DATA = {}
  DATA["act"] = act
  DATA["hosts"] = {}

  function getRowsTransactions(err, rows){
    if (err){console.log("ERROR:",err)}
    else if ( rows ){
      for (var i in rows){
        var row = rows[i]
        var data = {}
        data["pfkey"] = row.pfkey
        data["transaction"] = row.tran
        data["ts"] = getDateTimeStr(row.ts)
        data["max"] = row.max
        data["mean"] = row.mean
        data["min"] = row.min
        data["n"] = row.n
        data["sd"] = row.sd
        data["lm_a"] = row.lm_a

        if(!(row.host in DATA["hosts"])) DATA["hosts"][row.host] = {}
        if(!(row.pid in DATA["hosts"][row.host])) DATA["hosts"][row.host][row.pid] = []
        DATA["hosts"][row.host][row.pid].push(data)
      }
      for( var host in DATA["hosts"] ){
        for( var pid in DATA["hosts"][host] ){
          DATA["hosts"][host][pid].sort(function(x,y){
            if( x.ts<y.ts ) return -1
            if( x.ts>y.ts ) return 1
            return 0
          })
        }
      }
      debug("SELECT FROM raw transactions for act :", act, "... done.")
      callback(DATA)
    }
  }

  var chartTime = ago(self.config.chart_minutes, "minutes").toString()
  var query = null
  var tableName = isEdison(act) ? "raw_custom_transactions":"raw_transactions"
  var baseQuery1 = util.format("SELECT tran,pfkey,ts,host,pid,max,mean,min,n,sd,lm_a FROM %s WHERE act='%s' AND tran='%s' AND ts > %s ", tableName, act, tran, chartTime)
  var baseQuery2 = LIMIT_TRANSACTION_INSTANCES ? util.format("ORDER BY max DESC LIMIT %s", self.config.max_transaction_count.toString()) : ""
  if ( host.length>0 && host!="0" && pid>0 ) {
    var querySpecificHostPid = baseQuery1+"AND host='%s' AND pid=%s "+baseQuery2
    query = util.format(querySpecificHostPid, host, pid.toString())
  } else if ( host.length>0 && host!="0" && pid==0 ) {
    var querySpecificHost = baseQuery1+"AND host='%s' "+baseQuery2
    query = util.format(querySpecificHost, host)
  } else if ( (host.length==0 || host=="0") && pid>0 ) {
    var querySpecificPid = baseQuery1+"AND pid=%s "+baseQuery2
    query = util.format(querySpecificPid, pid.toString())
  } else {
    query = baseQuery1+baseQuery2
  }
  db.all(query,getRowsTransactions)
}

function postRawPiecesRoute(self,req,res){
  // "/post_raw_pieces/:version"
  // "/results/:version"
  var act = req.headers['concurix-api-key']
  var version = decodeURIComponent(req.params.version)

  self.postRawPieces(version, act, req.body, function(err){
    var returnCode = err ? 400 : 202
    res.writeHead(returnCode)
    res.end()
  })
}

MinkeLite.prototype.postRawPieces = function (version,act,trace,callback){
  // "/post_raw_pieces/:version"
  // "/results/:version"
  // returns err: false when post succeded, err: true when failed
  if(this.db_being_initialized){
    callback(true)
    return
  }
  var self = this
  debug("post_raw_pieces called with act %j version %j", act, version)
  for(var i in SUPPORTED_TRACER_VERSIONS){
    if( version.indexOf(SUPPORTED_TRACER_VERSIONS[i])==0 ){
      // self._write_raw_trace(act, trace, callback)
      populateMinkeTables(self, act, trace, callback)
      return
    }
  }
  console.error("post_raw_pieces unsupported version %j not %j",
        version, SUPPORTED_TRACER_VERSIONS);
  callback(true)
}

MinkeLite.prototype._write_raw_trace = function (act, trace, callback) {
  // exitIfNotReady(this, "_write_raw_trace")
  try {
    populateMinkeTables(this, act, trace, callback)
  } catch (e) {
    debug("*** Ignoring a duplicate insert for act :", act, e)
  }
}

function populateMinkeTables(self, act, trace, callback){
  if( trace.monitoring.system_info.arch=="ia32" && trace.metadata.timestamp < ago(10,"minutes") ) trace.metadata.timestamp = Date.now()
  var pfkeys = compilePfkey(self, act, trace)
  var pfkey = pfkeys[0]
  debug('populateMinkeTables pfKeys[1]=%j', pfkeys[1])
  var ts = trace.metadata.timestamp
  if( self.config.dev_mode ) ts = Date.now()
  async.parallel([
    function(async_cb){
      populateRawTraceTable(self, act, trace, pfkey, ts, async_cb)
      if ( debug.enabled ) self._read_all_records("raw_trace", false)
    }
    ,function(async_cb){
      populateRawMemoryPieces(self, act, trace, pfkey, ts, async_cb)
      if ( debug.enabled ) self._read_all_records("raw_memory_pieces", false)
    }
    ,function(async_cb){
      populateRawTransactions(self, act, trace, pfkey, ts, populateMetaTransactions, async_cb)
      if ( debug.enabled ) self._read_all_records("raw_transactions", false)
      // populateMetaTransactions(self, act, trace, pfkey, ts)
      // if ( debug.enabled ) self._read_all_records("meta_transactions", false)
    }
    ,function(async_cb){
      if ( trace.monitoring.custom_stats ){
        populateRawCustomTransactions(self, act, trace, pfkey, ts, populateMetaCustomTransactions, async_cb)
        if ( debug.enabled ) self._read_all_records("raw_custom_transactions", false)
        // populateMetaCustomTransactions(self, act, trace, pfkey, ts)
        // if ( debug.enabled ) self._read_all_records("meta_custom_transactions", false)
        }
      else {
        async_cb(null)
      }
    }
  ],function(err,result){
    freePfkey(pfkeys)
    if( err ){
      var tsStr = (new Date(ts)).toString()
      console.error("Trace insertion failure at", tsStr,"for",act,":",err)
    }
    callback(err)
  })
}

function populateRawTraceTable(self, act, trace, pfkey, ts, cb){
  async.waterfall([
    function(async_cb){
      if( SUPRESS_NOISY_WATERFALL_SEGMENTS ){
        for( var k in trace.waterfalls ){
          var waterfall = trace.waterfalls[k]
          for( var i=waterfall.segments.length-1; i>=0; i-- ){
            var segment = waterfall.segments[i]
            var segment_duration = segment.end - segment.start
            if( segment_duration < MINIMUM_SEGMENT_DURATION ) waterfall.segments.splice(i,1)
          }
        }
      }
      async_cb(null)
    }
    ,function(async_cb){
      zlib.gzip(JSON.stringify(trace), function(err,buf){
        async_cb(err,buf)
      })
    }
  ],function(err,buf){
    if( err ){cb(err);return}
    var db = self.db
    var stmt = db.prepare("INSERT INTO raw_trace(pfkey,ts,trace) VALUES ($pfkey,$ts,$trace)")
    var params = {}
    params.$pfkey = pfkey
    params.$ts = ts
    params.$trace = buf
    try {stmt.run(params)} catch (e){err = true}
    if ( !err && self.config.dev_mode ){
      for (var i = 0; i < EXTRA_WRITE_COUNT_IN_DEVMODE; i++) {
        var parts = pfkey.split($$$)
        params.$pfkey = parts[0]+$$$+md5((new Date()).toString()+Math.random().toString()+parts[1])
      try {stmt.run(params)} catch (e){err = true;break}
      }
    }
    stmt.finalize()
    cb(err)
  })
}

function getLMa(stats, trace){
  if ( stats==null ) return 0
  var p_mu = trace.monitoring.process_info.memory.heapUsed
  var s_la = trace.monitoring.system_info.loadavg["1m"]
  var p_mu_threshold = stats["p_mu_mean"] + stats["p_mu_sd"]*3
  var s_la_threshold = stats["s_la_mean"] + stats["s_la_sd"]*3
  var anomaly = ( (p_mu > p_mu_threshold) || (s_la > s_la_threshold) )
  return  anomaly ? 2 : 0
}

function populateRawMemoryPieces(self, act, trace, pfkey, ts, cb){
  var db = self.db
  var host = trace.monitoring.system_info.hostname
  var pid = trace.metadata.pid
  var act_host_pid = act+$$$+host+$$$+pid.toString()
  async.waterfall([
    function(async_cb){
      if ( self.config.stats_interval_seconds > 0 ) {
        var query = util.format("SELECT act_host_pid,p_mu_mean,p_mu_sd,s_la_mean,s_la_sd FROM model_mean_sd WHERE act_host_pid='%s'", act_host_pid)
        db.get(query, function(err,row){async_cb(null,row)})
      } else {async_cb(null,null)}
    }
  ],function(err,stats_mean_sd){
    if( err ){cb(err);return}
    var stmt = db.prepare("INSERT INTO raw_memory_pieces \
      ( pfkey, ts, act, host, pid, lm_a, p_mr, p_mt, p_mu, p_ut, s_la) VALUES \
      ($pfkey,$ts,$act,$host,$pid,$lm_a,$p_mr,$p_mt,$p_mu,$p_ut,$s_la)")
    var params = {}
    params.$pfkey = pfkey
    params.$ts = ts
    params.$act = act
    params.$host = host
    params.$pid = pid
    params.$p_mr = trace.monitoring.process_info.memory.rss
    params.$p_mt = trace.monitoring.process_info.memory.heapTotal
    params.$p_mu = trace.monitoring.process_info.memory.heapUsed
    params.$p_ut = trace.monitoring.process_info.uptime
    params.$s_la = trace.monitoring.system_info.loadavg["1m"]
    params.$lm_a = getLMa(stats_mean_sd, trace)
    stmt.run(params)
    stmt.finalize()
    cb(err)
  })
}

function getCustomStats(array){
  var stats = {}
  if( array && array.length>0 ){
    stats.max = Math.max.apply(Math, array)
    stats.min = Math.min.apply(Math, array)
    stats.mean = statslite.mean(array)
    stats.n = 1 // array.length
    stats.standard_deviation = statslite.stdev(array)
  }
  return stats
}

function populateRawCustomTransactions(self, act, trace, pfkey, ts, populateMeta, cb){
  if ( !trace.monitoring || !trace.monitoring.custom_stats || Object.keys(trace.monitoring.custom_stats).length==0 ){
    cb(null)
    return
  }
  var db = self.db
  var host = trace.monitoring.system_info.hostname
  var pid = trace.metadata.pid
  var act_host_pid = act+$$$+host+$$$+pid.toString()
  async.waterfall([
    function(async_cb){
      var query = util.format("SELECT act_host_pid,p_mu_mean,p_mu_sd,s_la_mean,s_la_sd FROM model_mean_sd WHERE act_host_pid='%s'", act_host_pid)
      db.get(query, function(err,row){async_cb(null,row)})
    }
  ],function(err,stats_mean_sd){
    if( err ){cb(err);return}
    var stmt = db.prepare("INSERT INTO raw_custom_transactions \
      ( act_tran_ts_host_pid, pfkey, ts, act, host, pid, tran, lm_a, max, mean, min, n, sd) VALUES \
      ($act_tran_ts_host_pid,$pfkey,$ts,$act,$host,$pid,$tran,$lm_a,$max,$mean,$min,$n,$sd)")
    var params = {}
    params.$pfkey = pfkey
    params.$ts = ts
    params.$act = act
    params.$host = trace.monitoring.system_info.hostname
    params.$pid = trace.metadata.pid
    params.$lm_a = 0 // getLMa(stats_mean_sd, trace)
    var act_ts_host_pid = act+$$$+ts.toString()+$$$+params.$host+$$$+params.$pid.toString()
    if ( self.config.dev_mode ) act_ts_host_pid += $$$+md5((new Date()).toString()+Math.random().toString())
    // for (var tran in trace.transactions.transactions){ // EDISON
    for (var tran in trace.monitoring.custom_stats){
      if( trace.monitoring.custom_stats[tran].length==0 ) continue // EDISON
      var stats = getCustomStats(trace.monitoring.custom_stats[tran]) // EDISON
      params.$act_tran_ts_host_pid = act_ts_host_pid+$$$+tran
      params.$tran = tran
      params.$max = stats.max
      params.$mean = stats.mean
      params.$min = stats.min
      params.$n = stats.n
      params.$sd = stats.standard_deviation
      stmt.run(params)
    }
    stmt.finalize()
    populateMeta(self, act, trace, pfkey, ts, cb)
  })
}

function populateRawTransactions(self, act, trace, pfkey, ts, populateMeta, cb){
  if ( !trace.transactions || !trace.transactions.transactions || Object.keys(trace.transactions.transactions).length==0 ){
    cb(null)
    return
  }
  var db = self.db
  var host = trace.monitoring.system_info.hostname
  var pid = trace.metadata.pid
  var act_host_pid = act+$$$+host+$$$+pid.toString()
  async.waterfall([
    function(async_cb){
      var query = util.format("SELECT act_host_pid,p_mu_mean,p_mu_sd,s_la_mean,s_la_sd FROM model_mean_sd WHERE act_host_pid='%s'", act_host_pid)
      db.get(query, function(err,row){async_cb(null,row)})
    }
  ],function(err,stats_mean_sd){
    if( err ){cb(err);return}
    var stmt = db.prepare("INSERT INTO raw_transactions \
      ( act_tran_ts_host_pid, pfkey, ts, act, host, pid, tran, lm_a, max, mean, min, n, sd) VALUES \
      ($act_tran_ts_host_pid,$pfkey,$ts,$act,$host,$pid,$tran,$lm_a,$max,$mean,$min,$n,$sd)")
    var params = {}
    params.$pfkey = pfkey
    params.$ts = ts
    params.$act = act
    params.$host = trace.monitoring.system_info.hostname
    params.$pid = trace.metadata.pid
    params.$lm_a = getLMa(stats_mean_sd, trace)
    var act_ts_host_pid = act+$$$+ts.toString()+$$$+params.$host+$$$+params.$pid.toString()
    if ( self.config.dev_mode ) act_ts_host_pid += $$$+md5((new Date()).toString()+Math.random().toString())
    for (var tran in trace.transactions.transactions){
      var stats = trace.transactions.transactions[tran].subset_stats
      params.$act_tran_ts_host_pid = act_ts_host_pid+$$$+tran
      params.$tran = tran
      params.$max = stats.max
      params.$mean = stats.mean
      params.$min = stats.min
      params.$n = stats.n
      params.$sd = stats.standard_deviation
      stmt.run(params)
    }
    stmt.finalize()
    populateMeta(self, act, trace, pfkey, ts, cb)
  })
}

function assembleTransBlob(transArray){
  var stringArray = []
  for(var i in transArray){
    var parts = transArray[i]
    stringArray.push(parts[1].toString() + $$_ + parts[0])
  }
  return stringArray.join($$$)
}

var TIMESTAMP_LENGTH = "1418410714939".length
function extractDuration(numericStr, cutOffTime){
  if( numericStr.length <= TIMESTAMP_LENGTH) return NaN
  var timestamp = parseInt(numericStr.substring(0,TIMESTAMP_LENGTH))
  if( isNaN(timestamp) || timestamp<cutOffTime ) return NaN
  var duration = parseInt(numericStr.substring(TIMESTAMP_LENGTH))
  if( cutOffTime>0 ) console.log("DEBUG", numericStr, cutOffTime, duration)
  return duration
}

function decomposeTransBlob(transBlob){
  var transArray =  []
  var trans = transBlob.split($$$)
  for(var i in trans){
    var tr = null
    var pos = trans[i].indexOf($$_)
    if( pos<0 ) {
      // console.log("*** ERROR decomposeTransBlob: separator not found.")
      // tr = [trans[i],1]
    }
    else {
      var duration = parseInt(trans[i].substring(0,pos))
      if( isNaN(duration) ){
        // console.log("*** ERROR decomposeTransBlob: invalid duration.")
        // tr = [trans[i],1]
      }
      else {
        tr = [trans[i].substring(pos+1),duration]
      }
    }
    if( tr ) transArray.push(tr)
  }
  return transArray
}

function isInTransArray(tran,value,transArray){
  for(var i in transArray){
    if( transArray[i][0]==tran ){
      if( transArray[i][1] >= value ){ return true }
      else { transArray.splice(i,1); return false }
    }
  }
  return false
}

function freeTransStrings(data){
  for(var host in data["hosts"]){
    for(var pid in data["hosts"][host]){
      var transStrings = data["hosts"][host][pid]
      for(var i in transStrings){
        // console.log("... freeing:",transStrings[i])
        delete transStrings[i]
      }
    }
  }
}

function freeTransArray(transArray){
  for(var i in transArray){
    delete transArray[i][0]
    delete transArray[i][1]
  }
}

function sortTransArray(transArray, sortByName){
  if ( sortByName ) sortTransArrayByName(transArray)
  else reverseSortTransArrayByValue(transArray)
}

function reverseSortTransArrayByValue(transArray){
  transArray.sort(function(x,y){
    if( x[1]<y[1] ) return 1
    if( x[1]>y[1] ) return -1
    return 0
  })
}

function sortTransArrayByName(transArray){
  transArray.sort(function(x,y){
    if( x[0]<y[0] ) return -1
    if( x[0]>y[0] ) return 1
    return 0
  })
}

function populateMetaCustomTransactions(self, act, trace, pfkey, ts, cb){
  if ( !trace.monitoring || !trace.monitoring.custom_stats || Object.keys(trace.monitoring.custom_stats).length==0 ){
    cb(null)
    return
  }
  var db = self.db
  var hour = getHourInt(ts)
  var host = trace.monitoring.system_info.hostname
  var pid = trace.metadata.pid
  var act_hour_host_pid = act+$$$+hour.toString()+$$$+host+$$$+pid.toString()
  var queryA = util.format("SELECT trans FROM meta_custom_transactions WHERE act_hour_host_pid='%s'", act_hour_host_pid)
  var queryB ="INSERT OR REPLACE INTO meta_custom_transactions \
    ( act_hour_host_pid, act, ts, hour, host, pid, trans) VALUES \
    ($act_hour_host_pid,$act,$ts,$hour,$host,$pid,$trans)"
  var params = {}
  params.$act_hour_host_pid = act_hour_host_pid
  params.$act = act
  params.$ts = ts
  params.$hour = hour
  params.$host = host
  params.$pid = pid
  debug("INSERT OR REPLACE meta_custom_transactions")
  db.serialize()
  var stmt = db.prepare(queryB)
  db.get(queryA, function(err,row){
    if( err ){db.parallelize();cb(err);return}
    var transArray = []
    if( row ) transArray = decomposeTransBlob(row.trans)
    // for (var tran in trace.transactions.transactions){ // EDISON
    for (var tran in trace.monitoring.custom_stats){
      if( trace.monitoring.custom_stats[tran].length==0 ) continue // EDISON
      var value = getCustomStats(trace.monitoring.custom_stats[tran]).max
      if ( ! isInTransArray(tran,value,transArray) ) transArray.push([tran,value])
    }

    if( transArray.length>0 ) { // EDISON
      params.$trans = assembleTransBlob(transArray)
      stmt.run(params)
    }
    stmt.finalize()
    db.parallelize()
    freeTransArray(transArray)
    delete params.$trans
    debug(" for",act_hour_host_pid,"... done.")
    cb(err)
  })
}

function populateMetaTransactions(self, act, trace, pfkey, ts, cb){
  if ( !trace.transactions || !trace.transactions.transactions || Object.keys(trace.transactions.transactions).length==0 ){
    cb(null)
    return
  }
  var db = self.db
  var hour = getHourInt(ts)
  var host = trace.monitoring.system_info.hostname
  var pid = trace.metadata.pid
  var act_hour_host_pid = act+$$$+hour.toString()+$$$+host+$$$+pid.toString()
  var queryA = util.format("SELECT trans FROM meta_transactions WHERE act_hour_host_pid='%s'", act_hour_host_pid)
  var queryB ="INSERT OR REPLACE INTO meta_transactions \
    ( act_hour_host_pid, act, ts, hour, host, pid, trans) VALUES \
    ($act_hour_host_pid,$act,$ts,$hour,$host,$pid,$trans)"
  var params = {}
  params.$act_hour_host_pid = act_hour_host_pid
  params.$act = act
  params.$ts = ts
  params.$hour = hour
  params.$host = host
  params.$pid = pid
  debug("INSERT OR REPLACE meta_transactions")
  db.serialize()
  var stmt = db.prepare(queryB)
  db.get(queryA, function(err,row){
    if( err ){db.parallelize();cb(err);return}
    var transArray = []
    if( row ) transArray = decomposeTransBlob(row.trans)
    for (var tran in trace.transactions.transactions){
      var value = trace.transactions.transactions[tran].subset_stats.max
      if ( ! isInTransArray(tran,value,transArray) ) transArray.push([tran,value])
    }
    params.$trans = assembleTransBlob(transArray)
    stmt.run(params)
    stmt.finalize()
    db.parallelize()
    freeTransArray(transArray)
    delete params.$trans
    debug(" for",act_hour_host_pid,"... done.")
    cb(err)
  })
}

MinkeLite.prototype._read_all_records = function (table, showContents) {
  // exitIfNotReady(this, "_read_all_records")
  var db = this.db
  var query = util.format("SELECT %s FROM %s", showContents ? "*" : "count(*)", table)
  db.each(query, function(err,row){process.stdout.write(table+" :\t");printRow(err,row)})
}

MinkeLite.prototype._list_tables = function (callback) {
  // exitIfNotReady(this, "_list_tables")
  var db = this.db
  var query = "SELECT name FROM sqlite_master WHERE type='table'"
  db.all(query, function(err,rows){
    var tableNames = []
    for (var i in rows){tableNames.push(rows[i].name)}
    callback(err,tableNames)
  })
}

MinkeLite.prototype._delete_stale_records = function (tableName, value, unitStr) {
  // exitIfNotReady(this, "_delete_stale_records")
  var db = this.db
  var tsThereshold = ago(value, unitStr)
  var query = util.format("DELETE FROM %s WHERE ts < %s", tableName, tsThereshold.toString())
  debug("DELETE FROM",tableName,'... done.')
  db.run(query)
}

function deleteAllStaleRecords () {
  var self = this
  var value = this.config.stale_minutes
  var unitStr = "minute"
  for (var i in self.config.system_tables){
    var tableName = self.config.system_tables[i].name
    self._delete_stale_records(tableName,value,unitStr)
  }
}

function populateStatsMeanSd(self, value, unitStr){
  var db = self.db
  var DATA = {}

  function meanAndSdOfArray(array){
    var mean = statslite.mean(array)
    var sd = statslite.stdev(array)
    return [mean, sd]
  }

  function readRowsRawMemoryPieces(err, rows){
    if (err){console.log("ERROR:",err)}
    else if (rows!=null){
      DATA["ts"] = Date.now()
      DATA["points"] = {}
      for (var i in rows){
        var row = rows[i]
        var act_host_pid = row.act+$$$+row.host+$$$+row.pid.toString()
        if( act_host_pid in DATA["points"] ){
          var dp = DATA["points"][act_host_pid]
          dp["p_mu"].push(row.p_mu)
          dp["s_la"].push(row.s_la)
        } else {
          var dp = {}
          dp["p_mu"] = [row.p_mu]
          dp["s_la"] = [row.s_la]
          DATA["points"][act_host_pid] = dp
        }
      }
      for (var act_host_pid in DATA["points"]){
        var dp = DATA["points"][act_host_pid]
        if( dp["p_mu"].length < MIN_DATA_POINTS_REQUIRED_FOR_MODELING ){
          delete DATA["points"][act_host_pid]
          continue
        }
        var meanSd = meanAndSdOfArray(dp["p_mu"])
        dp["p_mu_mean"] = meanSd[0]
        dp["p_mu_sd"] = meanSd[1]
        var meanSd = meanAndSdOfArray(dp["s_la"])
        dp["s_la_mean"] = meanSd[0]
        dp["s_la_sd"] = meanSd[1]
        delete dp["p_mu"]
        delete dp["s_la"]
      }
    }
    this()
  }

  var tsThereshold = ago(value, unitStr)
  var querySelect = util.format("SELECT act_host_pid FROM model_mean_sd WHERE act_host_pid = $act_host_pid AND ts > %s", tsThereshold)
  var queryUpdate = "UPDATE model_mean_sd SET ts=$ts, \
    p_mu_mean=$p_mu_mean,p_mu_sd=$p_mu_sd,s_la_mean=$s_la_mean,s_la_sd=$s_la_sd \
    WHERE act_host_pid=$act_host_pid"
  var queryInsert = "INSERT INTO model_mean_sd \
    ( act_host_pid, ts, p_mu_mean, p_mu_sd, s_la_mean, s_la_sd ) VALUES \
    ($act_host_pid,$ts,$p_mu_mean,$p_mu_sd,$s_la_mean,$s_la_sd )"
  async.series([
    function(cb){
      var query = util.format("SELECT act,host,pid,p_mu,s_la FROM raw_memory_pieces WHERE ts > %s", tsThereshold)
      db.all(query,readRowsRawMemoryPieces.bind(cb))
    }
  ],
  function(err,result){
    var stmtSelect = db.prepare(querySelect)
    var stmtUpdate = db.prepare(queryUpdate)
    var stmtInsert = db.prepare(queryInsert)
    var keys = Object.keys(DATA["points"])
    for (var i in keys){
      var act_host_pid = keys[i]
      var lastActHostPid = (i==keys.length-1)
      var dp = DATA["points"][act_host_pid]
      var asyncP = {"ahp":act_host_pid, "lastOne":lastActHostPid, "dPoint":dp, "stmtS":stmtSelect, "stmtU": stmtUpdate, "stmtI": stmtInsert, "now": DATA["ts"]}
      async.waterfall([
        function(cb){cb(null,this)}.bind(asyncP)
        ,function(AP,cb){
          var params = {}
          params.$act_host_pid = AP.ahp
          stmtSelect.get(params,function(err,row){
            var found = false
            if (err){console.log("ERROR:",err)}
            else{found = (row!=null)}
            AP.found = found
            cb(null,AP)
          })
        }]
        ,function(err,AP){
          var stmt = null
          if ( AP.found ){
            stmt = AP.stmtU
            debug("UPDATE model_mean_sd")
          } else {
            stmt = AP.stmtI
            debug("INSERT model_mean_sd")
          }
          var params = {}
          params.$act_host_pid = AP.ahp
          params.$ts = AP.now
          params.$p_mu_mean = AP.dPoint["p_mu_mean"]
          params.$p_mu_sd = AP.dPoint["p_mu_sd"]
          params.$s_la_mean = AP.dPoint["s_la_mean"]
          params.$s_la_sd = AP.dPoint["s_la_sd"]
          stmt.run(params,function(err){
            debug(" for",this.ahp,"... done.")
            if ( this.lastOne ){
              this.stmtS.finalize()
              this.stmtU.finalize()
              this.stmtI.finalize()
            }
          }.bind(AP))
        }
      )
    }
  })
}

function buildStats () {
  var self = this
  var value = this.config.stale_minutes
  var unitStr = "minute"
  populateStatsMeanSd(self,value,unitStr)
  if ( debug.enabled ) self._read_all_records("model_mean_sd", false)
}

// Utilities

// var trace = {monitoring:{system_info:{hostname:"hostname"}},metadata:{pid:12345,timestamp:12345467890123}};
// compilePfkey("cx-dataserver",trace)
// --> 'cx-dataserver#0/hostname#0/12345/12345467890.json'
function compilePfkey(self, act, trace){
  var pfkey = act+"/"
  pfkey += trace.monitoring.system_info.hostname
  if ( self.config.dev_mode ) pfkey += $$$+md5((new Date()).toString()+Math.random().toString())
  pfkey += "#0/"
  pfkey += trace.metadata.pid.toString()+"/"
  // pfkey += Math.floor(trace.metadata.timestamp/1000).toString()+".json"
  pfkey += trace.metadata.timestamp.toString()+".json"
  return [md5(act)+$$$+md5(pfkey+Date.now().toString()), pfkey]
}

function freePfkey(pfkey){
  delete pfkey[0]
  delete pfkey[1]
}

function isEdison(act){
  return /^edison/.test(act)
}

function parseInteger(str){
  if( str==null ) return null
  var intValue = null
  try{intValue = parseInt(str)} catch (e) {intValue = 0}
  return intValue
}

function writeHeaderJSON(res, compress) {
  compress = ( compress==null ) ? true : compress
  var option = {'Content-Type': 'application/json'}
  if( compress ) option['Content-Encoding'] = 'gzip'
  res.writeHead(200, option)
}

function zipAndRespond(data,res){
  data["timestamp"] = getDateTimeStr(Date.now())
  zlib.gzip(JSON.stringify(data),function(err, gzipped_buf){
    writeHeaderJSON(res)
    res.write(gzipped_buf)
    res.end()
  })
}

var getDateTimeStr = getISODateTimeStr

function getGMTDateTimeStr(ts){

  function zeroFill(s){
    if ( s.length==1 ) s = '0'+s
    return s
  }

  var dt = new Date(ts)
  var dtStr = dt.getUTCFullYear().toString()
  dtStr += '-'+zeroFill((dt.getUTCMonth()+1).toString())
  dtStr += '-'+zeroFill(dt.getUTCDate().toString())
  dtStr += ' '+zeroFill(dt.getUTCHours().toString())
  dtStr += ':'+zeroFill(dt.getUTCMinutes().toString())
  dtStr += ':'+zeroFill(dt.getUTCSeconds().toString())
  return dtStr+" GMT"
}

function getISODateTimeStr(ts){
  var dt = new Date(ts)
  return dt.toISOString()
}

function getHourInt(epochTs){
  var dt = new Date(epochTs)
  return 1000000*dt.getUTCFullYear()+10000*(dt.getUTCMonth()+1)+100*dt.getUTCDate()+dt.getUTCHours()
}

function printRow(err, row){
  if (err) {
    console.log("ERROR:",err)
  }
  else if (row != null){
    console.log(JSON.stringify(row).substring(0,1000))
  }
}

function exitIfNotReady(inst, myName){
  if (inst.db_being_initialized) {
    console.log(myName, " db being initialized.");
    process.exit(1)
  }
  if (!inst.db_exists) {
    console.log(myName, " db does not exist.");
    process.exit(1)
  }
}
