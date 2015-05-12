module.exports = function(app) {

	var setup = require('./api.routes/setup.controller');
	var callback = require('./api.routes/callback.controller');
	var index = function(req, res){
		res.sendStatus(200);
	};

	console.log('Setting up routes');
	app.get('/', index);
	app.use('/api/setup', setup);
	app.use('/api/callback', callback);
};