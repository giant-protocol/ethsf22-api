var express = require('express');

var cors = require('cors');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var path = require('path');

const app = express();
app.use(cors());
app.enable('trust proxy');
app.set('trust proxy', 1);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());


// Global giant-connect object.
var ethsf = {};
ethsf.logger = require('./helpers/logger');



// Helpers
ethsf.helpers = {};
ethsf.helpers.errors = require('./helpers/errors');


//Controllers
ethsf.controllers = {};

//Models
ethsf.models = {};

//middleware
ethsf.middlewares = {};

// Configs
ethsf.configs = {};
ethsf.configs.rootDir = path.dirname(require.main.filename);

// Modules
ethsf.modules = {};
ethsf.modules.api = require('./modules/api');
ethsf.modules.api(app, ethsf);

// Database
ethsf.database = require('./database/db');

// Connect Database
ethsf.database(ethsf,process.env.MONGO_URI);

/**.
 * @return 200 status.
 */
app.get('/',function(req, res){
    res.json({	application: 'ETHSF API',
        version: '1.0'
    });
});

// Error Handling
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
        status: 'error',
        errors: err.body ? err.body.errors : '',
        message: err.message
    });
});

var port = process.env.PORT || 5001;
var httpServer = require('http').createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
httpServer.listen(port, function() {
    console.log('ETHSF server Running on port ' + port + '.');
});