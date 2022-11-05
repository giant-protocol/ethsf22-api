'use strict';


var apiMiddleware = {
    authenticate: function (ethsf) {
        return async function (req, res, next) {
            next();
        };

    }
};

module.exports = apiMiddleware;
