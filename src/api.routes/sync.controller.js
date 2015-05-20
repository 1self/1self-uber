'use strict';

var express = require('express');
var router = express.Router();
var config = require('../config');
var request = require('request');
var Q = require('q');
var authModule = require('../auth');
var qdServiceModule = require('../qdService');

var auth = new authModule();
var qdService = new qdServiceModule(config.CONTEXT_URI); 

var cache = {
	products: {},
	requests: {}
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

var uberRequestIDToReceipt = function(id, authToken) {
	var deferred = Q.defer();
	if (!cache.requests.hasOwnProperty(id)) {
		var opts = {
			url: "https://api.uber.com/v1/requests/" + id + "/receipt",
			json: true,
			headers: {
				'Authorization': "Bearer " + authToken
			}
		};
		request(opts, function(err, response, body) {
			if (err) deferred.reject(err);
			else {
				cache.requests[id] = body.total_charged;
				deferred.resolve(body.total_charged);
			}
		});
	} else {
		deferred.resolve(cache.products[id]);
	}
	return deferred.promise;
};

var getHistory = function(access_token, offset) {
	if (!offset) offset = 0;
	var deferred = Q.defer();
	var opts = {
		url: 'https://api.uber.com/v1.2/history?offset='+ offset +'&limit=50',
		json: true,
		headers: {
			'Authorization': "Bearer " + access_token
		}
	};

	request(opts, function(error, _, body) {
		if (error || !body.hasOwnProperty('history')) {
			console.log("Request to 1.2/history failed");
			deferred.reject(error);
		} else {
			var latestSyncField = offset;
			var transforms = body.history.map(function(trip) {
				var trippy = {
					latestSyncField: ++latestSyncField,
					request_id: trip.request_id,
					location: {
						'lat': trip.start_city.latitude,
						'long': trip.start_city.longitude
					},
					request: {},
					start: {},
					end: {}
				};

				var deferred = Q.defer();
				var mileToMeter = 1.60934 * 1000;

				uberProductIDToName(trip.product_id, access_token)
					.then(function(desc) {
						trippy.request.product = desc;
						return Q.resolve();
					})
					.then(function(){
						return uberRequestIDToReceipt(trip.request_id, access_token);
					})
					.then(function(total_charged){
						trippy.end.charge = total_charged;
						return Q.resolve();
					})
					.then(function() {
						return timzoneOffsetFromLocation(trip.start_city.latitude, trip.start_city.longitude);
					})
					.then(function(offset) {
						trippy.request.dateTime = UNIXToISO(trip.request_time, offset);
						trippy.request.city = trip.start_city.display_name;
						trippy.request.latestSyncField = trippy.latestSyncField + 0.1;
						
						trippy.start.dateTime = UNIXToISO(trip.start_time, offset);
						trippy.start['wait-duration'] = trip.start_time - trip.request_time;
						trippy.start.latestSyncField = trippy.latestSyncField + 0.2;

						trippy.end.dateTime = UNIXToISO(trip.end_time, offset);
						trippy.end.duration = trip.end_time - trip.start_time;
						trippy.end.distance = trip.distance * mileToMeter;
						trippy.end.status = trip.status;
						trippy.end.latestSyncField = trippy.latestSyncField + 0.3;

						return Q.resolve();
					})
					.done(function(err) {
						if (err) {
							console.log("Transform error ", err);
						}
						deferred.resolve(trippy);
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

var formatRequestEvent = function(event) {
	return {
		"location": event.location,
		"chainId": event.request_id,
		"actionTags": [
			"request"
		],
		"source": "Uber",
		"objectTags": [
			"transport",
			"taxi",
			"uber"
		],
		"dateTime": event.request.dateTime,
		"latestSyncField": event.request.latestSyncField,
		"properties": {
			"product": event.request.product,
			"city": event.request.city
		}
	};
};

var formatStartEvent = function(event) {
	return {
		"location": event.location,
		"chainId": event.request_id,
		"actionTags": [
			"start"
		],
		"source": "Uber",
		"objectTags": [
			"transport",
			"taxi",
			"uber"
		],
		"dateTime": event.start.dateTime,
		"latestSyncField": event.start.latestSyncField,
		"properties": {
			"wait-duration": event.start['wait-duration']
		}
	};
};

var formatEndEvent = function(event) {
	var costProp = "cost-"+event.end.charge.charAt(0); //No ES6 computed prop love :( 
	var obj = {
		"chainId": event.request_id,
		"location": event.location,
		"actionTags": [
			"complete"
		],
		"source": "Uber",
		"objectTags": [
			"transport",
			"taxi",
			"uber"
		],
		"dateTime": event.end.dateTime,
		"latestSyncField": event.end.latestSyncField,
		"properties": {
		}
	};
	obj.properties[costProp] = parseFloat(event.end.charge.substring(1), 10);
	obj.properties["duration"] = event.end.duration;
	obj.properties["distance"] = event.end.distance;
	return obj;
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

	checkToken
	.then(getHistory)
	.then(function(results){
		var events = results.reduce(function(acc, e){
			return acc.concat(formatRequestEvent(e)).concat(formatStartEvent(e)).concat(formatEndEvent(e));
		}, []);
		res.send(events);
	})
	.catch(function(err){
		console.log(err);
		res.status(500).send({'error': err.message});
	});
};

router.use(syncEvents);

module.exports = router;