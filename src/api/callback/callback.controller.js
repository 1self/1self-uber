'use strict';

var express = require('express');
var router = express.Router();
var config = require('../../config');
var request = require('request');

var authenticateUser = function(req, res, next) {
	var authorization_code = req.query.code;
	var state = req.query.state;

	var auth_url = 'https://login.uber.com/oauth/token';
	var params = {
		"client_secret": config.client_secret,
		"client_id": config.client_id,
		grant_type: 'authorization_code',
		redirect_uri: 'http://localhost:9005/api/callback',
		"code": authorization_code
	};
	
	request.post({
		url: auth_url,
		form: params
	}, function(err, httpRes, body){
		res.send(httpRes);
	});
};

router.use(authenticateUser);

module.exports = router;