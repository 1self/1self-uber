var express = require('express');
var config = require('./config');
var bodyParser = require('body-parser');

process.env.NODE_ENV = config.NODE_ENV;

var app = express();
var server = require('http').createServer(app);

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
require('./routes')(app);


server.listen(config.port, config.ip, function () {
  console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
});

exports = module.exports = app;
