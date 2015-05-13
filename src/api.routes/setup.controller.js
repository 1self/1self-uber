'use strict';

var express = require('express');
var router = express.Router();
var authModule = require('../auth');

var auth = new authModule();

var authenticateUser = function(req, res, next) {
	var url = auth.getUberOAuthUrl();
	console.log("Redirecting to ", url);
	res.redirect(url);
};

router.use(authenticateUser);

module.exports = router;
