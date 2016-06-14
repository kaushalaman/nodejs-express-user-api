var MINKELITE_PORT = 8102
var HOST = "localhost"
var ACT_KEY = "wfp:mf3d4p"

var cx = require('concurix')({
	accountKey: ACT_KEY,
	archiveInterval: 5000,
	api_host: HOST,
	api_port: MINKELITE_PORT
})

var MinkeLite = require("../index")
var fs = require("fs")
var http = require("http")
var zlib = require('zlib')

var DEBUG = false

var MINKELITE = MinkeLite({"verbose":true,"in_memory":true,"start_server":true,"server_port":MINKELITE_PORT})
var LOAD_TRACE_INTERVAL_SECONDS = 1

function loadTrace(){
	var trace = fs.readFileSync("./cx-websever_1412467216_formatted.json");
	zlib.gzip(trace,function(err, gzipped_buf){
		MINKELITE.db.serialize(function(){
			// postGzTrace(gzipped_buf)
			_upload(gzipped_buf)
			// MINKELITE._write_raw_trace(trace, "wfp:mf3d4p")
			MINKELITE._read_all_records("raw_trace", false)
			MINKELITE._read_all_records("raw_memory_pieces", false)
			MINKELITE._read_all_records("raw_transactions", false)
			MINKELITE._read_all_records("meta_transactions", false)
			MINKELITE._read_all_records("model_mean_sd", false)
		})
		// MINKELITE.shutdown()
	})
}

function postGzTrace(buf){
	var url = 'http://'+HOST+':'+MINKELITE_PORT.toString()+'/results/1.0.1'
	var compressed = buf
	request.post({
		url: url,
		body: compressed,
		headers: {
			"content-type": "application/json",
			"content-length": compressed.length,
			"content-encoding": "gzip",
			"Concurix-API-Key": ACT_KEY,
			"Concurix-Host": HOST,
			"Concurix-Pid": process.pid
	    }
	}, function (err, res, body) {
		console.log("Status code of test.js/postGzTrace POST: %s", res.statusCode)
	 	if (err) {console.log("err:", err)}
	})
}

function _upload(compressed) {
  var options = {
    agent: false,
    host: HOST,
    port: MINKELITE_PORT,
    path: "/results/1.0.1",
    method: "POST",
    headers: {
		"content-type": "application/json",
		"content-length": compressed.length,
		"content-encoding": "gzip",
		"Concurix-API-Key": ACT_KEY,
		"Concurix-Host": HOST,
		"Concurix-Pid": process.pid
    }
  }
  var req = http.request(options, function (res) {
	console.log("Status code of test.js/_upload POST: %s", res.statusCode)
    if (res.statusCode != 202) {
      console.log("Failed to upload: %s", res.statusCode)
    }
  })
  req.end(compressed)
  req.on("error", function (err) {
    console.log("Error attempting to upload trace file: %s", err)
  })
}


// TRACE_LOADER = setInterval(loadTrace, LOAD_TRACE_INTERVAL_SECONDS*1000)
