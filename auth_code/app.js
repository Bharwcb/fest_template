var express = require('express');
var request = require('request');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
require('dotenv').config();

var app = express();

var generateRandomString = function(length) {
	var text = '';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (var i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
};

var redirect_uri = 'http://localhost:8888/callback';
var stateKey = 'spotify_auth_state';

app
.use(express.static(__dirname + '/public'))
.use(cookieParser());

app
.get('/login', function(req, res) {

	// Use cookies to ensure user didn't just go straight to callback, and in fact received random string after authenticated. Cookies are key/value.
	var state = generateRandomString(16);
	res.cookie(stateKey, state);

	// authorization / request spotify 'code'
	var scope = 'user-read-private user-read-email user-follow-read user-library-read user-top-read';

	console.log('Authorizing with Spotify, redirecting to https://accounts.spotify.com/authorize?...');
	res.redirect('https://accounts.spotify.com/authorize?' + querystring.stringify({
			response_type = 'code',
			client_id: process.env.CLIENT_ID,
			scope: scope,
			redirect_uri: redirect_uri,
			state: state
		}));
});

// spotify returns with code, now request access token after checking state parameter
app.get('/callback', function(req, res) {

	/* 
	WHATS HAPPENING HERE?

	Isn't code and state returned in the response from first call, not request? Or is this building the next request?
	*/
	var code = req.query.code || null;
	var state = req.query.state || null;
	var storedState = req.cookies ? req.cookies[stateKey] : null;

	if (state === null || state !== storedState) {
		res.redirect('/#' + querystring.stringify({
			error: 'state_mismatch'
		}));
	} else {

		res.clearCookie(stateKey);
		var authOptions = {
			url: 'https://accounts.spotify.com/api/token',
			// form same as body
			form: {
				code: code,
				redirect_uri: redirect_uri,
				grant_type: 'authorization_code'
			},
			headers: {
				'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
			},
			json: true
		};

		request.post(authOptions, function(err, response, body) {
			console.log("Requesting access token...");

			if (!error && response.statusCode === 200) {

				console("Access token granted");
				var access_token = body.access_token;
				var refresh_token = body.refresh_token;

				var options = {
					url: 'https://api.spotify.com/v1/me',
					headers: { 'Authorization': 'Bearar ' + access_token },
					json: true
				};

				// use access token
				request.get(options, function(err, response, body) {
					console.log("body: ", body);
				});

			} else {
				res.redirect('/#' + querystring.stringify({
					error: 'invalid_token'
				}));
			}
		});
	}
});

app.get('/refresh_token', function(req, res) {

	console.log("Requesting access token from refresh token");
	var refresh_token = req.query.refresh_token;
	var authOptions = {
		url: 'https://accounts.spotify.com/api/token',
		headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
		form: {
			grant_type: 'refresh_token',
			refresh_token: refresh_token
		},
		json: true
	};

	request.post(authOptions, function(err, response, body) {
		if (!error && response.statusCode === 200) {
			var access_token = body.access_token;
			res.send({
				'access_token': access_token
			});
		}
	});
});

console.log("Listening on 8888");
app.listen(8888);




