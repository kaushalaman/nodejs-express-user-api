var http = require('http');
var cicada = require('../');
var test = require('tap').test;
var spawn = require('child_process').spawn;
var tmpdir = require('os').tmpdir;
var path = require('path');
var fs = require('fs');

var repoDir = path.resolve(fs.realpathSync(tmpdir()),
                           'cicada-test',
                           Math.random().toString(16).slice(2));
var ci = cicada(repoDir);
var server = http.createServer(ci.handle);

test('setup', function (t) {
    server.listen(0, '127.0.0.1', t.end.bind(t));
});

test('push', function (t) {
    t.plan(6);

    ci.on('commit', function (commit) {
        t.equal(commit.repo, 'beep.git');
        var workDir = path.join(repoDir, 'work');
        t.equal(commit.dir.slice(0, workDir.length), workDir);

        (function () {
            var ps = commit.spawn('ls');
            var data = '';
            ps.stdout.on('data', function (buf) { data += buf });
            ps.on('close', function (code) {
                t.equal(code, 0);
                t.equal(data, 'robot.txt\n');
            });
        })();

        (function () {
            var ps = commit.spawn('node -p process.cwd()');
            var data = '';
            ps.stdout.on('data', function (buf) { data += buf });
            ps.on('close', function (code) {
                t.equal(code, 0);
                t.equal(data, commit.dir + '\n');
            });
        })();
    });

    spawn(process.execPath, [ path.join(__dirname, 'git-push.js'),
        'http://127.0.0.1:' + server.address().port + '/beep.git'
    ]);
});

test('teardown', function (t) {
    server.close();
    t.end();
});
