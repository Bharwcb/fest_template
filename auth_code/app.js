require('dotenv').config();
const express = require('express');
const request = require('request');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const array = require('lodash/array');

const app = express();

const generateRandomString = function(length) {
	var text = '';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (var i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
};

const redirectUri = 'http://localhost:8888/callback/';
const stateKey = 'spotify_auth_state';

app
.use(express.static(__dirname + '/public'));

app
.use(cookieParser());

// ~~~ Login to Spotify code ~~~
app
.get('/login', function(req, res) {

	// Use cookies to ensure user didn't just go straight to callback, and in fact received random string after authenticated. Cookies are key/value.
	const state = generateRandomString(16);
	res.cookie(stateKey, state);

	// authorization / request spotify 'code'
	const scope = 'user-read-private user-read-email user-follow-read user-library-read user-top-read';

	const request_auth_code_query = querystring.stringify({
		response_type: 'code', 
		client_id: process.env.CLIENT_ID,
		scope: scope,
		redirect_uri: redirectUri,
		state: state,
		// require login every time for testing
		show_dialog: true
	});
	console.log("\nRequesting Auth Code from Spotify");
	res.redirect('https://accounts.spotify.com/authorize?' + request_auth_code_query);
});

/* 
redirect URI is /callback?authorization_code=12345... 
request access token after checking state parameter 
*/
app.get('/callback', function(req, res) {
	const code = req.query.code || null;
	const state = req.query.state || null;
	const storedState = req.cookies ? req.cookies[stateKey] : null;

	if (state === null || state !== storedState) {
		res.redirect('/#' + querystring.stringify({
			error: 'state_mismatch'
		}));
	} else {
		res.clearCookie(stateKey);
		const authOptions = {
			url: 'https://accounts.spotify.com/api/token',
			form: {
				code: code,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code',
			},
			headers: {
				'Authorization': 'Basic ' + (new Buffer(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
			},
			json: true
		};

		request.post(authOptions, function(error, response, body) {
			console.log("\nRequesting Access Token using Auth Code");

			if (!error && response.statusCode === 200) {
				console.log("\nAccess Token granted");
				let access_token = body.access_token;
				const refresh_token = body.refresh_token;
				const options = {
					url: 'https://api.spotify.com/v1/me',
					headers: { 'Authorization': 'Bearer ' + access_token },
					json: true
				};

				// use access token
				request.get(options, function(err, response, body) {
					// console.log("body: ", body);
				});

				// redirect to homepage
				res.redirect('/#' + querystring.stringify({
					access_token: access_token,
					refresh_token: refresh_token
				}));

			} else {
				res.redirect('/#' + querystring.stringify({
					error: 'invalid_token'
				}));
			}

		});
	}
});
// ~~~ End login to Spotify code ~~~

// ~~~ Refresh code - INCOMPLETE ~~~
app.get('/refresh_token', function(req, res) {

	console.log("\nRequesting access token from refresh token");
	const refresh_token = req.query.refresh_token;
	const authOptions = {
		url: 'https://accounts.spotify.com/api/token',
		headers: { 'Authorization': 'Basic ' + (new Buffer(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64')) },
		form: {
			grant_type: 'refresh_token',
			refresh_token: refresh_token
		},
		json: true
	};

	request.post(authOptions, function(err, response, body) {
		if (!err && response.statusCode === 200) {
			console.log('\nNew access token granted');
			let access_token = body.access_token;
			res.send({
				'access_token': access_token
			});
		}
	});
});
// ~~~ End refresh code

console.log("\nListening on 8888");
app.listen(8888);
