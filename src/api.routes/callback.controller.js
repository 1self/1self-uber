'use strict';

var express = require('express');
var router = express.Router();
var config = require('../config');
var request = require('request');
var Q = require('q');

var getOAuthBearerToken = function(endpoint, data) {
	var deferred = Q.defer();

	request.post(endpoint, {form: data, json: true}, function(err, response, body){
		if(err) {
			deferred.reject(err);
		} else {
			deferred.resolve(body);
		}
	});

	return deferred.promise;
}

var authenticateUser = function authenticateUser(req, res, next) {
	var authorization_code = req.query.code;
	var state = req.query.state;
	console.log(authorization_code, state);

	var auth_url = 'https://login.uber.com/oauth/token';
	var data = {
		client_secret: config.client_secret,
		client_id: config.client_id,
		grant_type: 'authorization_code',
		redirect_uri: 'http://localhost:9005/api/callback',
		code: authorization_code
	};

	getOAuthBearerToken(auth_url, data)
	.then(function(response){
		console.log(response.access_token);
		res.send(response);
	})
	.catch(function(err){
		res.send(err);
	});
};

router.use(authenticateUser);

module.exports = router;
