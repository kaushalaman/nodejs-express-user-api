var expect  = require('chai').expect,
    _       = require('underscore'),
    Fixture = require('./fixture'),
    Fake    = require('./fake'),
    Backend = require('../lib/backend.js')

describe('new backend', function() {
  var backend = new Backend({
    host: "abc", port: 123, format: "hello", vars: {}
  })

  it('should have a message formatter', function() {
    expect(backend.mf).to.exist
  })

  it('should have a vars map', function() {
    expect(backend.vars).to.exist
  })

  it('should have stats', function() {
    expect(backend.stats).to.not.be.empty
  })
})

describe('flush with no metrics', function() {
  var sock = new Fake.Socket()
  var backend = new Backend({
    socket: sock
  })

  beforeEach(function() {
    backend.flush(Fixture.timestamp, {})
  })

  it('should not send counters', function() {
    expect(sock.messages).to.have.length(0)
  })
})

describe('flushing counters', function() {
  var metric = null
  var sock = new Fake.Socket()
  var backend = new Backend({
    socket: sock, vars: { 'Abc': '123' }
  })

  beforeEach(function() {
    backend.flush(Fixture.timestamp, {
      counters: Fixture.counters
    })
    metric = _.last(sock.messages)
  })

  it('should send a counter', function() {
    expect(metric).to.exist
  })

  it('should send a metric kvp', function() {
    expect(metric).to.contain('api.request_count=100')
  })

  it('should send a stat name', function() {
    expect(metric).to.contain('stat=api.request_count')
  })

  it('should send a count', function() {
    expect(metric).to.contain('count=100')
  })

  it('should send a timestamp', function() {
    expect(metric).to.contain('time=' + Fixture.now.toString())
  })

  it('should send a var', function() {
    expect(metric).to.contain('Abc=123')
  })

  it('should not send a statsd counter', function() {
    var counters = _.filter(sock.messages, function(m) {
      return m.indexOf('statsd.') != -1
    })
    expect(counters).to.have.length(0)
  })
})

describe('flushing timers', function() {
  var metric = null
  var sock = new Fake.Socket()
  var backend = new Backend({
    socket: sock, vars: { 'Abc': '123' }
  })

  beforeEach(function() {
    backend.flush(Fixture.timestamp, {
      timers: Fixture.timers
    })

    metric = _.last(sock.messages)
  })

  it('should send a timer', function() {
    expect(metric).to.exist
  })

  it('should send a metric kvp', function() {
    expect(metric).to.contain('api.request_time=2')
  })

  it('should send a stat name', function() {
    expect(metric).to.contain('stat=api.request_time')
  })

  it('should send an avg', function() {
    expect(metric).to.contain('avg=2')
  })

  it('should send a min', function() {
    expect(metric).to.contain('min=0')
  })

  it('should send a max', function() {
    expect(metric).to.contain('max=4')
  })

  it('should send a sample count', function() {
    expect(metric).to.contain('samples=5')
  })

  it('should send a timestamp', function() {
    expect(metric).to.contain('time=' + Fixture.now.toString())
  })

  it('should send a var', function() {
    expect(metric).to.contain('Abc=123')
  })
})

describe('status', function() {
  var backend = new Backend({}, 123)
  var backend_name, backend_status = {}

  beforeEach(function() {
    backend.status(function(err, name, key, value) {
      backend_name = name
      backend_status[key] = value
    })
  })

  it('should provide a backend name', function() {
    expect(backend_name).to.equal('udpkv')
  })

  it('should report a last_flush', function() {
    expect(backend_status.last_flush).to.equal(123)
  })

  it('should report a last_exception', function() {
    expect(backend_status.last_exception).to.equal(123)
  })
})

describe('flushing gauges', function() {
  var metric = null
  var sock = new Fake.Socket()
  var backend = new Backend({
    socket: sock, vars: { 'Abc': '123' }
  })

  beforeEach(function() {
    backend.flush(Fixture.timestamp, {
      gauges: Fixture.gauges
    })
    metric = _.last(sock.messages)
    //console.error(metric); process.exit(1);
  })

  it('should send a gauge', function() {
    expect(metric).to.exist
  })

  it('should send a metric kvp', function() {
    expect(metric).to.contain('api.num_sessions=50')
  })

  it('should send a stat name', function() {
    expect(metric).to.contain('stat=api.num_sessions')
  })

  it('should send a count', function() {
    expect(metric).to.contain('gauge=50')
  })

  it('should send a timestamp', function() {
    expect(metric).to.contain('time=' + Fixture.now.toString())
  })

  it('should send a var', function() {
    expect(metric).to.contain('Abc=123')
  })

  it('should not send a statsd counter', function() {
    var counters = _.filter(sock.messages, function(m) {
      return m.indexOf('statsd.') != -1
    })
    expect(counters).to.have.length(0)
  })
})

describe('invalid host configuration', function() {
  it('should have a log message', function(done) {
    var logger = {
      log: log
    };
    var backend = new Backend({
      host: "locahost", port: 123
    }, null, binder, logger);

    function binder(flush, status) {
      setImmediate(function() {
        flush(1, {counters: {'a.count': 1}});
      });
    }

    function log(msg) {
      expect(msg).to.contain('getaddrinfo');
      return done();
    }
  })
})
