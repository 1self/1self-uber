'use strict';

var express = require('express');
var router = express.Router();
var config = require('../config');
var request = require('request');
var Q = require('q');
var authModule = require('../auth');
var auth = new authModule();

var cache = {
	products: {}
};

var getRefreshedAccessToken = function() {
	//todo - implement in auth.js
}
var zeroPadToTwoDigits = function(num) {
	var num_s = "" + num;
	return num_s.length >= 2 ? num_s : "0" + num_s;
};

var convertUNIXTime = function(unix_timestamp) {
	var date = new Date(unix_timestamp * 1000);
	return date;
};

var UNIXToISO = function(unix_timestamp, tz_offset_hours) {
	var offsetToISO = function(offset) {
		if (parseInt(offset) === 0) return '-0000';
		var parts = (offset + "").split('.');
		var m = (parseInt(parts[1] || "0") / 10) * 60;

		var prefix = offset < 0 ? "-" : "+";
		var hh = zeroPadToTwoDigits(parts[0]);
		var mm = zeroPadToTwoDigits(m);
		return prefix + hh + ":" + mm;
	};

	var localtime = convertUNIXTime(unix_timestamp);
	var date_s = localtime.getFullYear() + '-' + zeroPadToTwoDigits(localtime.getMonth()) + '-' + zeroPadToTwoDigits(localtime.getDay());

	var time_s = zeroPadToTwoDigits(localtime.getHours()) + ":" + zeroPadToTwoDigits(localtime.getMinutes()) + ":" + zeroPadToTwoDigits(localtime.getSeconds());

	return date_s + "T" + time_s + offsetToISO(tz_offset_hours);
};

var timzoneOffsetFromLocation = function(lat, long) {
	var deferred = Q.defer();
	var geonameUrl = 'http://api.geonames.org/timezoneJSON?lat=' + lat + '&lng=' + long + '&username=' + config.GEONAME_USER;

	var opts = {
		url: geonameUrl,
		json: true
	};

	request(opts, function(err, response, body) {
		if (err) {
			console.log("Couldn't resolve timezone: ", err);
			deferred.reject(err);
		} else {
			deferred.resolve(body.gmtOffset);
		}
	});
	return deferred.promise;
};

var uberProductIDToName = function(id, authToken) {
	var deferred = Q.defer();
	if (!cache.products.hasOwnProperty(id)) {
		var opts = {
			url: "https://api.uber.com/v1/products/" + id,
			json: true,
			headers: {
				'Authorization': "Bearer " + authToken
			}
		};
		request(opts, function(err, response, body) {
			if (err) deferred.reject(err);
			else {
				cache.products[id] = body.display_name;
				deferred.resolve(body.display_name);
			}
		});
	} else {
		deferred.resolve(cache.products[id]);
	}
	return deferred.promise;
};

var syncEvents = function(req, res, next) {
	var checkToken = Q.fcall(function() {
		if (req.session.hasOwnProperty('access_token')) {
			return req.session.access_token;
		} else {
			console.log("Access Token missing")
			throw new Error("Not Authenticated");
		}
	});

	var getHistory = function(access_token) {
		var deferred = Q.defer();
		var opts = {
			url: 'https://api.uber.com/v1.2/history?limit=50',
			json: true,
			headers: {
				'Authorization': "Bearer " + access_token
			}
		};

		request(opts, function(error, _, body) {
			if (error) {
				console.log("Request to 1.2/history failed");
				deferred.reject(error);
			} else {
				var transforms = body.history.map(function(trip) {
					var deferred = Q.defer();
					var mileToKilometer = 1.60934;

					trip.distance = trip.distance * mileToKilometer;

					uberProductIDToName(trip.product_id, access_token)
						.then(function(desc) {
							trip.product = desc;
							return Q.resolve();
						})
						.then(function() {
							return timzoneOffsetFromLocation(trip.start_city.latitude, trip.start_city.longitude);
						})
						.then(function(offset) {
							trip.request_time = UNIXToISO(trip.request_time, offset);
							trip.start_time = UNIXToISO(trip.start_time, offset);
							trip.end_time = UNIXToISO(trip.end_time, offset);
							return Q.resolve();
						})
						.done(function(err) {
							if(err) {
								console.log("Transform error ", err);
							}
							deferred.resolve(trip);
						});

					return deferred.promise;
				});

				Q.all(transforms)
				.then(function(results) {
					deferred.resolve(results);
				})
				.catch(function(err) {
					console.log('151: ', err);
					deferred.reject(err);
				});
			}
		});
		return deferred.promise;
	};

	checkToken
	.then(getHistory)
	.then(function(results){
		res.send(results);
	})
	.catch(function(err){
		console.log(err);
		res.status(500).send({'error': err.message});
	});
};

router.use(syncEvents);

module.exports = router;