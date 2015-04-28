'use strict';

var express = require('express');
var router = express.Router();
var request = require('request');
var config = require('../../config');

var clientID = config.client_id;
var clientSecret = config.client_secret;
var uberState = config.state;
var uberBaseSite = 'https://login.uber.com';
var uberAuthPath = '/oauth/authorize';

var authenticateUser = function(req, res, next) {
	//Authorize
	var uberAuthUrl = uberBaseSite + uberAuthPath;
	var url = uberAuthUrl + '?client_id=' + clientID + '&response_type=code';// + '&state=' + uberState;
	console.log(url);
	res.redirect(url);
}

router.use(authenticateUser);

module.exports = router;