module.exports = function(app) {

	var setup = require('./api.routes/setup.controller');
	var callback = require('./api.routes/callback.controller');
	var sync = require('./api.routes/sync.controller');
	var index = function(req, res){
		res.sendStatus(200);
	};

	console.log('Setting up routes');
	app.get('/', index);
	app.use('/api/setup', setup);
	app.use('/api/callback', callback);
	app.use('/api/sync', sync);
};