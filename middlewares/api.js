'use strict';

/**
 * Created by ethsf on 06/11/22.
 */
var apiMiddleware = {
    authenticate: function (ethsf) {
        return async function (req, res, next) {
            next();
        };

    }
};

module.exports = apiMiddleware;
