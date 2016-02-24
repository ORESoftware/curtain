/**
 * Created by denman on 2/3/2016.
 */


///////////////////////////////////////////////

var assert = require('assert');
var Redis = require('ioredis');
var pathToRegexp = require('path-to-regexp');
var parseUrl = require('parseurl');

///////////////////////////////////////////////////

/*
 This is the simple version of this module that only rate limits requests by user/request id using Redis

 TODO: need to allow for rate limiting on particular routes
 e.g., if the user has two different routes for which they want a different rate limit, then the Redis key has to be different

 */

////////////////////////////////////////////////////


function Rate(conf) {

    this.verbose = conf.verbose !== false;  //default to true

    if (conf.redis) {
        if (conf.redis.client) {
            this.client = conf.redis.client;
        }
        else {
            this.client = new Redis(conf.redis);
        }
    }
    else {
        throw new Error('No Redis configuration provided to Curtain module constructor');
    }
}


Rate.errors = Rate.prototype.errors = Object.freeze({
    'NO_KEY': 'NO_KEY',
    'RATE_EXCEEDED': 'RATE_EXCEEDED',
    'REDIS_ERROR': 'REDIS_ERROR',
    'BAD_ARGUMENTS': 'BAD_ARGUMENTS'
});

Rate.opts = Rate.prototype.opts = Object.freeze({
    'maxReqsPerPeriod': 'maxReqsPerPeriod',
    'periodMillis': 'periodMillis',
    'excludeRoutes': 'excludeRoutes',
    'includeRoutes': 'includeRoutes',
    'log': 'log'
});


Rate.prototype.limit = function rateLimit(opts) {

    var excludeRoutesRegexp = null;
    var includeOnlyRoutesRegexp = null;

    var self = this;
    var isIncludeOnly = false;

    var req, currentPath, maxReqsPerPeriod, logFunction, periodMillis, identifier, excludeRoutes, includeOnlyRoutes;

    return new Promise(function (resolve, reject) {

        try {
            req = opts.req;
            logFunction = opts.log || null;
            maxReqsPerPeriod = opts.maxReqsPerPeriod ? parseInt(opts.maxReqsPerPeriod) : null;
            periodMillis = opts.periodMillis ? parseInt(opts.periodMillis) : null;
            identifier = opts.identifier ? String(opts.identifier) : null;
            excludeRoutes = opts.excludeRoutes ? JSON.parse(JSON.stringify(opts.excludeRoutes)) : null;
            includeOnlyRoutes = opts.includeRoutes ? JSON.parse(JSON.stringify(opts.includeRoutes)) : null;

            if (includeOnlyRoutes) {
                assert(Array.isArray(includeOnlyRoutes));
                if (includeOnlyRoutes.length > 0) {
                    isIncludeOnly = true;
                }
            }
            if (excludeRoutes) {
                assert(Array.isArray(excludeRoutes));
            }

            if (excludeRoutes && excludeRoutes.length > 0) {
                excludeRoutesRegexp = pathToRegexp(excludeRoutes);
            }
            if (includeOnlyRoutes && includeOnlyRoutes.length > 0) {
                includeOnlyRoutesRegexp = pathToRegexp(includeOnlyRoutes);
            }

        }
        catch (err) {

            if (logFunction) {
                logFunction(err.stack);
            }

            return reject({
                type: Rate.errors.BAD_ARGUMENTS,
                error: err
            });
        }


        if (isIncludeOnly && includeOnlyRoutesRegexp) {
            if (!includeOnlyRoutesRegexp.test(parseUrl(req).pathname)) {

                if (logFunction) {
                    logFunction('req with url:', req.path, 'was *skipped* by curtain because it was not *included*.');
                }
                //if we have an include only list, and there is no match - the route is already excluded, don't need to check exclude list
                return resolve({rateExceeded: false, routeExcluded: true});
            }
        }


        if (excludeRoutesRegexp && excludeRoutesRegexp.test(parseUrl(req).pathname)) {
            if (logFunction) {
                logFunction('req with url:', req.path, 'was *skipped* by curtain because it was in the exclude list.');
            }

            return resolve({rateExceeded: false, routeExcluded: true});
        }

        if (logFunction) {
            logFunction('req with url:', req.path, 'was *processed* by curtain.');
        }


        req.__curtained = req.__curtained ? req.__curtained++ : 1;

        if (req.__curtained > 1 && this.verbose) {
            if (logFunction) {
                logFunction('Warning: rate limiter used twice for this same request. Two suppress warnings like this, use verbose:false options.');
            }
        }


        function redisSet(error, value) {

            self.client.set(key, value, err => {
                if (err && !error) {
                    reject({type: Rate.errors.REDIS_ERROR, error: err});
                }
                else {
                    self.client.expire(key, Math.ceil(periodMillis / 1000) + 5); // expire the key at least 5 seconds after
                    error ? reject(error) : resolve({rateExceeded: false, routeExcluded: false});
                }
            });
        }

        var key = String(req[identifier]);

        if (!identifier || !key) {
            return reject({
                type: Rate.errors.BAD_ARGUMENTS,
                error: new Error(`opts.identifier given as (${opts.identifier}) could not produce a valid result from the req object`)
            })
        }
        else if (!maxReqsPerPeriod) {
            return reject({
                type: Rate.errors.BAD_ARGUMENTS,
                error: new Error(`opts.periodMillis given as (${opts.periodMillis}) was null/undefined or not a valid number`)
            })
        }
        else if (!periodMillis) {
            return reject({
                type: Rate.errors.BAD_ARGUMENTS,
                error: new Error(`opts.maxReqsPerPeriod given as (${opts.maxReqsPerPeriod}) was null/undefined or not a valid number`)
            })
        }
        else {

            this.client.get(key, (err, result) => {
                if (err) {
                    reject({
                        type: Rate.errors.REDIS_ERROR,
                        error: err
                    });
                }
                else if (result) {

                    result = JSON.parse(result).sort(function (a, b) {
                        return a - b; //we must run a sort by timestamp in case they are out of order, which may happen due to async nature
                    });

                    var now = Date.now();
                    result.push(now); //always push timestamp of latest request

                    var length = result.length;
                    var error = null;

                    if (length >= maxReqsPerPeriod) {

                        var diff = now - result.shift();  // compare diff between now and oldest request time

                        if (diff <= periodMillis) {  //check if difference between newest request and oldest stored request is smaller than window
                            error = {
                                type: Rate.errors.RATE_EXCEEDED,
                                error: new Error('Exceeded ' + maxReqsPerPeriod + ' requests per time period.')
                            };
                        }
                    }

                    redisSet(error, JSON.stringify(result));

                }
                else {
                    // setting new value in redis
                    redisSet(null, JSON.stringify([Date.now()]));
                }
            });
        }
    });

};


module.exports = Rate;