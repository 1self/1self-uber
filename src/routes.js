module.exports = function(app) {

	var setupRoute = require('./api/setup');
	//var setupRoute = require('./api/setup')(app);
	var callbackRoute = require('./api/callback');


	// Insert routes below
	console.log('setting up routes');
	app.get('/', function(req, res){
		console.log('Hello');
		res.sendStatus(200);
	})
	app.use('/api/setup', setupRoute);
	//app.use('/api/setup', setupRoute);
	app.use('/api/callback', callbackRoute);
};