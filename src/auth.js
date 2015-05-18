var Q = require('q');
var request = require('request');
var config = require('./config');

module.exports = function() {

  var clientID = config.client_id;
  var clientSecret = config.client_secret;
  var uberState = config.state;
  var cipherKey = config.cipherKey;

  var uberBaseSite = 'https://login.uber.com';
  var uberAuthPath = '/oauth/authorize';
  var auth_url = 'https://login.uber.com/oauth/token';

  this.getUberOAuthUrl = function() {
    var uberAuthUrl = uberBaseSite + uberAuthPath;
    var url = uberAuthUrl + '?client_id=' + clientID + '&scope=history' +'&response_type=code' + '&state=' + uberState;
    return url;
  };

  this.getOAuthBearerToken = function(authorization_code) {
  	var deferred = Q.defer();
    var endpoint = auth_url;
    var data = {
    		client_secret: config.client_secret,
    		client_id: config.client_id,
    		grant_type: 'authorization_code',
    		redirect_uri: 'http://localhost:9005/api/callback',
    		code: authorization_code
    	};

  	request.post(endpoint, {form: data, json: true}, function(err, response, body){
  		if(err) {
  			deferred.reject(err);
  		} else {
  			deferred.resolve(body);
  		}
  	});
  	return deferred.promise;
  };

//middleware
this.authenticateRequest = function(req, res, next) {
  if(req.session.authToken) {
    res.setHeader("Authorization", "Bearer "+ req.session.authToken);
  }
  return next();
};

function encrypt(text){
  var cipher = crypto.createCipher('aes-256-cbc',cipherKey);
  var crypted = cipher.update(text,'utf8','hex');
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text){
  var decipher = crypto.createDecipher('aes-256-cbc',cipherKey);
  var dec = decipher.update(text,'hex','utf8');
  dec += decipher.final('utf8');
  return dec;
}

};
