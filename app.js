
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var bgg = require('./routes/bgg');
var http = require('http');
var path = require('path');

var app = express();
app.locals.moment = require('moment'); // For date handling in Jade

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/playhistory', routes.playhistory);
app.get('/lastplays', routes.lastplays);

//map all possible bgg routes
bgg.types.forEach(function(type){
  app.get('/api/' + type, bgg[type]);
});


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
