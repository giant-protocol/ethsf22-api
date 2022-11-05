/**
 * Created by aequalis on 11/13/19.
 */
'use strict';

// REST API Module
var express = require('express');

module.exports = init;
function init(app, ethsf, router) {
    ethsf.logger.debug('Api Module Loaded!');

    if (!router) {
        router = express.Router();
    }

    ethsf.controllers.api = {};
    ethsf.helpers.api = {};
    ethsf.models.api = {};

    ethsf.configs.api = require(ethsf.configs.rootDir +'/configs/api');

    //model init
    ethsf.models.api.purchase = require(ethsf.configs.rootDir +'/models/purchases-mdl');
    ethsf.models.api.payment = require(ethsf.configs.rootDir +'/models/payment-mdl');




    //hlpr init
    ethsf.helpers.api.token = require(ethsf.configs.rootDir +'/helpers/token-hlpr');




    //ctrl init
    ethsf.controllers.api.token = require(ethsf.configs.rootDir +'/controllers/token-ctrl');




    //middlewere loading
   /* ethsf.middlewares.api = require( ethsf.configs.rootDir +'/middlewares/api');
    router.use(ethsf.middlewares.api.authenticate(ethsf));
*/

    ethsf.controllers.api.token(app, ethsf, router);


    if (ethsf.configs.api.urlWithVersionNumber) {
        app.use(ethsf.configs.api.apiUrl + '/' + ethsf.configs.api.version, router);
    } else {
        app.use(ethsf.configs.api.apiUrl, router);
    }

}
