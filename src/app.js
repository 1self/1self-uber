//main
var express = require('express');
var config = require('./config');
var bodyParser = require('body-parser');

process.env.NODE_ENV = config.NODE_ENV;

// Setup server
var app = express();
var server = require('http').createServer(app);

app.use(bodyParser.urlencoded({
  extended: true
}));
require('./routes')(app);


// Start server
server.listen(config.port, config.ip, function () {
  console.log('Blah Express server listening on %d, in %s mode', config.port, app.get('env'));
});

// Expose app
exports = module.exports = app;