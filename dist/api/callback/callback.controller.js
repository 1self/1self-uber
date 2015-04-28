'use strict';

var express = require('express');
var router = express.Router();
var config = require('../../config');
var request = require('request');

var authenticateUser = function authenticateUser(req, res, next) {
	var authorization_code = req.query.code;
	var state = req.query.state;
	console.log(authorization_code, state);

	var auth_url = 'https://login.uber.com/oauth/token';
	var data = {
		client_secret: config.client_secret,
		client_id: config.client_id,
		grant_type: 'authorization_code',
		redirect_uri: '',
		code: authorization_code
	};
	console.log(data);
	request.post({ url: auth_url, form: data }, function (err, response, body) {
		console.log(err, body);
		res.sendStatus(response.statusCode || 200);
	});
};

router.use(authenticateUser);

module.exports = router;