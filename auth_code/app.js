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
.use(express.statis(__dirname + '/public'))
.use(cookieParser())

.get('/login', function(req, res) {

	// Use cookies to ensure user didn't just go straight to callback, and in fact received random string after authenticated. Cookies are key/value.
	var state = generateRandomString(16);
	res.cookie(stateKey, state);

	// authorization
	var scope = 'user-read-private user-read-email user-follow-read user-library-read user-top-read';
	res.redirect('https://accounts.spotify.com/authorize?' + querystring.stringify({
			response_tope = 'code',
			client_id: process.env.CLIENT_ID,
			csope: scope.
			redirect_uri:redirect_uri,
			state: state
		}));
})