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

var formatUNIXTime = function(unix_timestamp){
	var date = new Date(unix_timestamp*1000);
	var hours = date.getHours();
	var minutes = "0" + date.getMinutes();
	var seconds = "0" + date.getSeconds();

	return date;
};

var UNIXToISO = function(unix_timestamp, tz_offset_hours) {
	var zeroPadToTwo = function(num) {
		var num_s = ""+num;
		return num_s.length >= 2 ? num_s : "0"+num_s;
	};

	var offsetToISO = function(offset){
		var parts = (offset + "").split('.');
		var m = (parseInt(parts[1] || "0")/10) * 60;
		var prefix = offset < 0 ? "-" : "+";
		var hh = zeroPadToTwo(parts[0]);
		var mm = zeroPadToTwo(m);
		return prefix+hh+":"+mm;
	};

	var localtime = formatUNIXTime(unix_timestamp);
	var date_s = localtime.getFullYear() + '-' + zeroPadToTwo(localtime.getMonth()) + '-' + zeroPadToTwo(localtime.getDay());

	var time_s = zeroPadToTwo(localtime.getHours()) + ":" + zeroPadToTwo(localtime.getMinutes()) + ":" + zeroPadToTwo(localtime.getSeconds());

	return date_s + "T" + time_s + offsetToISO(tz_offset_hours);
};

var timzoneOffsetFromLocation = function(lat, long) {
	var deferred = Q.defer();
	var geonameUrl = 'http://api.geonames.org/timezoneJSON?lat='+ lat +'&lng='+ long +'&username=' + config.GEONAME_USER;

	var opts = {
		url: geonameUrl,
		json: true
	};

	request(opts, function(err, response, body){
		if(err) {
			deferred.reject(err);
		} else {
			deferred.resolve(body.gmtOffset);
		}
	});

	return deferred.promise;
};

var cache = {};
var uberProductIDToName = function(id, authToken) {
		var deferred = Q.defer();
		if(typeof cache[id] === 'undefined') {
			var opts = {
				url: "https://api.uber.com/v1/products/" + id,
				json: true,
				headers: {
					'Authorization': "Bearer "+ authToken
				}
			};
			request(opts, function(err, response, body){
				if(err) deferred.reject(err);
				else {
					cache[id] = body.display_name;
					deferred.resolve(cache[id]);
				}
			});
		} else {
			deferred.resolve(cache[id]);
		}
		return deferred.promise;
};

var authenticateUser = function authenticateUser(req, res, next) {
	var authorization_code = req.query.code;
	var state = req.query.state;

	if(state !== config.state) {
		res.status(401).send({'status':401,'error':'Authorization error'});
	}

	var startAuthSession = function(response) {
		var deferred = Q.defer();
		if(typeof response.access_token === 'undefined') {
			deferred.reject({'error':401});
		} else {
			req.session.authToken = response.access_token;
			deferred.resolve(response);
		}
		return deferred.promise;
	};

	auth.getOAuthBearerToken(authorization_code)
	.then(function(response){
		var opts = {
			url: 'https://api.uber.com/v1.2/history?limit=50',
			json: true,
			headers: {
				'Authorization': "Bearer "+ response.access_token
			}
		};

		request(opts, function(error, _, body){
			if(error) {
				res.status(500).send(error);
			} else {
				var transforms = body.history.map(function(trip) {
					var deferred = Q.defer();

					trip.distance = trip.distance * 1.60934; //miles to kilometeres
					uberProductIDToName(trip.product_id, response.access_token)
					.then(function(desc){
						trip.product = desc;
						return Q.resolve();
					})
					.then(function(){
						return timzoneOffsetFromLocation(trip.start_city.latitude, trip.start_city.longitude);
					})
					.then(function(offset){
						trip.request_time = UNIXToISO(trip.request_time, offset);
						trip.start_time = UNIXToISO(trip.start_time, offset);
						trip.end_time = UNIXToISO(trip.end_time, offset);
						return Q.resolve();
					})
					.done(function(err){
						deferred.resolve(trip);
					});

					return deferred.promise;
				});

				Q.all(transforms)
				.then(function(results){
					res.send(results);
				})
				.catch(function(err){
					res.status(500).send(err);
				});
			}
		});
	})
	.catch(function(err){
		res.send(err);
	});
};

router.use(authenticateUser);

module.exports = router;
