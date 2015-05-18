'use strict';

var express = require('express');
var router = express.Router();
var config = require('../config');
var request = require('request');
var Q = require('q');
var authModule = require('../auth');
var auth = new authModule();

var getRefreshedAccessToken = function(){
	//todo
}

var authenticateUser = function(req, res, next) {
	var authorization_code = req.query.code;
	var state = req.query.state;

	if(state !== config.state) {
		res.status(401).send({'status':401,'error':'Authorization error'});
	}

	auth.getOAuthBearerToken(authorization_code)
	.then(function(response){
		console.log('Redirecting to api/sync');
		req.session.access_token = response.access_token;
		res.redirect('/api/sync');
	})
	.catch(function(err){
		console.log("Caught an error :-/ ");
		res.status(500).send({'error':err});
	});
};

router.use(authenticateUser);

module.exports = router;
