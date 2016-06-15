var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var config = require('./config');
var routes = require('./routes/index');
var users = require('./routes/users');
var mongoose = require('mongoose');
//var swagger = require('swagger-express');

var app = express();

// view engine setup
app.set('port', process.env.PORT || config.serverConfig.PORT);  
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.all('/*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

/*app.get('routes/index',function(request, response){
  response.render('index');
});
*/
//Load website
app.use(express.static('client'));
app.get('/home',(req,res)=>{
    console.log(__dirname);
    res.sendFile(__dirname+'/client/index.html');
});

// use apis
app.use('/', routes);
app.use('/:id',routes);
app.use('/users', users);
app.use('/post',routes);
app.use('/user/api/register',routes);
app.use('/users/data', routes);
app.use('/user/api/login',routes);
app.use('/user/api/delete', routes);
app.use('/user/api/logout', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


// app start
app.listen(config.serverConfig.PORT, function(req, res){
  console.log("started");
});

module.exports = app;