/**
 * Created by denman on 2/3/2016.
 */


///////////////////////////////////////////////

var assert = require('assert');
var Redis = require('ioredis');

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
    'router': 'router',
});


function skip(req, res, next) {
    console.log('req with path:', req.path, 'was set to skip....');
    req.skipCurtain = true;
    next();
}

function only(req, res, next) {
    console.log('req with path:', req.path, 'was set to only....');
    req.onlyCurtain = true;
    next();
}


Rate.prototype.limit = function rateLimit(opts) {

    var self = this;
    var isIncludeOnly = false;

    var router, maxReqsPerPeriod, periodMillis, identifier, excludeRoutes, includeRoutes;

    try {
        router = opts.router;  //either app or what not
        maxReqsPerPeriod = opts.maxReqsPerPeriod ? parseInt(opts.maxReqsPerPeriod) : null;
        periodMillis = opts.periodMillis ? parseInt(opts.periodMillis) : null;
        identifier = opts.identifier ? String(opts.identifier) : null;
        excludeRoutes = opts.excludeRoutes ? JSON.parse(JSON.stringify(opts.excludeRoutes)) : null;
        includeRoutes = opts.includeRoutes ? JSON.parse(JSON.stringify(opts.includeRoutes)) : null;

        if (includeRoutes) {
            assert(router.use);
            assert(Array.isArray(includeRoutes));
        }
        if (excludeRoutes) {
            assert(router.use);
            assert(Array.isArray(excludeRoutes));
        }

    }
    catch (err) {
        return (req, res, next) => {
            next(err);
        }
    }

    (excludeRoutes || []).forEach(function (route) {
        router.use(route, skip);
    });

    (includeRoutes || []).forEach(function (route) {
        isIncludeOnly = true;
        router.use(route, only);
    });

    return (req, res, next) => {

        if (req.skipCurtain === true) {
            console.log('req with url:', req.path, 'was *skipped* by curtain.');
            delete req.skipCurtain; //so that other curtain limiters can work correctly
            return next();
        }
        else {
            console.log('req with url:', req.path, 'was *processed* by curtain.');
        }

        if (isIncludeOnly && !req.onlyCurtain) {
            console.log('req with url:', req.path, 'was *skipped* by curtain because it was not *included*.');
            return next();
        }

        delete req.onlyCurtain;  //delete this property so that it doesn't interfere with other curtain limiters

        req.curtained = req.curtained ? req.curtained++ : 1;

        if (req.curtained > 1 && this.verbose) {
            console.log('Warning: rate limiter used twice for this same request. Two suppress warnings like this, use verbose:false options.');
        }


        function redisSet(error, value) {

            self.client.set(key, value, err => {
                if (err) {
                    if (error) {
                        next(error);
                    }
                    else {
                        next({type: Rate.errors.REDIS_ERROR, msg: err});
                    }
                }
                else {
                    self.client.expire(key, Math.ceil(periodMillis / 1000) + 5); // expire the key at least 5 seconds after
                    next(error); //if there's an error, send it on
                }
            });
        }

        var key = String(req[identifier]);

        if (!identifier || !key) {
            next({
                type: Rate.errors.BAD_ARGUMENTS,
                msg: `opts.identifier given as (${opts.identifier}) could not produce a valid result from the req object`
            })
        }
        else if (!maxReqsPerPeriod) {
            next({
                type: Rate.errors.BAD_ARGUMENTS,
                msg: `opts.periodMillis given as (${opts.periodMillis}) was null/undefined or not a valid number`
            })
        }
        else if (!periodMillis) {
            next({
                type: Rate.errors.BAD_ARGUMENTS,
                msg: `opts.maxReqsPerPeriod given as (${opts.maxReqsPerPeriod}) was null/undefined or not a valid number`
            })
        }
        else {

            this.client.get(key, (err, result) => {
                if (err) {
                    next({type: Rate.errors.REDIS_ERROR});
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
                                msg: 'Exceeded ' + maxReqsPerPeriod + ' requests per second for XRE events'
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

    }


};


module.exports = Rate;