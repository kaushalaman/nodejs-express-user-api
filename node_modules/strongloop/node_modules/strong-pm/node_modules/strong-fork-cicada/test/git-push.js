require('shelljs/global');
var fs = require('fs');
var path = require('path');
var tmpdir = require('os').tmpdir;

var dir = path.resolve(fs.realpathSync(tmpdir()), 'cicada-test', Math.random().toString(16).slice(2));
mkdir('-p', dir);
cd(dir);
'beep boop!'.to('robot.txt');
exec('git init');
exec('git add robot.txt');
exec('git commit -m "beep boop"');
exec('git push "' + process.argv[2] + '" master');
