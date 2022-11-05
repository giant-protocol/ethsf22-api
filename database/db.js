'use strict';

function init(ethsf, dbURI)
{
	var mongoose = require( 'mongoose' );
	var timer = 5000;

	mongoose.connect(dbURI,{ useNewUrlParser: true ,useUnifiedTopology: true});

	// When successfully connected
	mongoose.connection.on('connected', function () {
		// Reset timer to 5 Sec.
		timer = 1;
		ethsf.db = mongoose.connection;
		ethsf.logger.info('connection to database established');
	});

	// If the connection throws an error
	mongoose.connection.on('error',function (err) {
		ethsf.logger.error('Mongoose connection error: ' + err);

	});

	// When the connection is disconnected
	mongoose.connection.on('disconnected', function () {
		ethsf.logger.debug('Mongoose default connection disconnected');
	});

	// If the Node process ends, close the Mongoose connection
	process.on('SIGINT', function() {
		mongoose.connection.close(function () {
			ethsf.logger.debug('Mongoose default connection disconnected through app termination');
			process.exit(0);
		});
	});
}

module.exports = init;
