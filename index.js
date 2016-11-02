'use strict';


//core
const assert = require('assert');

//npm
const Redis = require('ioredis');
const pathToRegexp = require('path-to-regexp');
const parseUrl = require('parseurl');

//project
const workWithRedis = require('./lib/work-with-redis');
const setOptions = require('./lib/set-options');
const filterIncludeExclude = require('./lib/filter-request');

///////////////////////////////////////////////////

/*
 This is the simple version of this module that only rate limits requests by user/request id using Redis

 TODO: allow ability to block users if rate is exceeded by far too much or too many consecutive times
 TODO: need to allow for rate limiting on particular routes
 => e.g., if the user has two different routes for which they want a different rate limit,
 then the Redis key has to be different

 */

////////////////////////////////////////////////

function Curtain(conf) {

    this.verbose = conf.verbose !== false; //default to true

    if (conf.redis) {
        if (conf.redis.client) {
            this.client = conf.redis.client;
        } else {
            this.client = new Redis(conf.redis);
        }
    } else {
        throw new Error('No Redis configuration provided to Curtain module constructor');
    }
}


Curtain.errors = Curtain.prototype.errors = Object.freeze({
    'NO_KEY': 'NO_KEY',
    'RATE_EXCEEDED': 'RATE_EXCEEDED',
    'REDIS_ERROR': 'REDIS_ERROR',
    'BAD_ARGUMENTS': 'BAD_ARGUMENTS'
});

Curtain.opts = Curtain.prototype.opts = Object.freeze({
    'maxReqsPerPeriod': 'maxReqsPerPeriod',
    'periodMillis': 'periodMillis',
    'excludeRoutes': 'excludeRoutes',
    'includeRoutes': 'includeRoutes',
    'log': 'log'
});



Curtain.prototype.limitMiddleware = function (opts) {

    try {
        this.optz = setOptions(opts);
    } catch (err) {
        throw new Error(' => Curtain usage error => Bad arguments =>\n' + err.stack);
    }

    const bigC = this;
    const client = bigC.client;

    const {

        logFn,
        excludeRoutesRegexp,
        includeOnlyRoutesRegexp,
        isIncludeOnly,
        maxReqsPerPeriod,
        identifier,
        periodMillis

    } = this.optz;

    return function (req, res, next) {

        var filter;

        try {
            if (filter = filterIncludeExclude(bigC.optz, parseUrl(req).pathname)) {
                return next(filter);
            }
        }
        catch (err) {
            return next({
                curtainError: true,
                error: err
            });
        }


        if (logFn) {
            logFn('req with url:', req.path, 'was *processed* by curtain.');
        }


        req.__curtained = req.__curtained ? req.__curtained++ : 1;

        if (req.__curtained > 1 && self.verbose) {
            if (logFn) {
                logFn('Warning: rate limiter used twice for this same request. Two suppress warnings like this, use verbose:false options.');
            }
        }

        //req, optz, client, resolve, reject
        workWithRedis(req, bigC.optz, client, next, next);

    }

};


Curtain.prototype.limit = function rateLimitWithCurtain(opts) {

    const bigC = this;

    try {
        this.optz = setOptions(opts);
    } catch (err) {
        throw new Error(' => Curtain usage error => Bad arguments =>\n' + err.stack);
    }

    const {

        req,
        logFn,
        excludeRoutesRegexp,
        includeOnlyRoutesRegexp,
        isIncludeOnly,
        maxReqsPerPeriod,
        identifier,
        periodMillis

    } = this.optz;

    return new Promise(function (resolve, reject) {

        var filter;

        try {
            if (filter = filterIncludeExclude(bigC.optz, parseUrl(req).pathname)) {
                return resolve(filter);
            }
        }
        catch (err) {
            return reject(err);
        }


        if (logFn) {
            logFn('req with url:', req.path, 'was *processed* by curtain.');
        }

        req.__curtained = req.__curtained ? req.__curtained++ : 1;

        if (req.__curtained > 1 && self.verbose) {
            if (logFn) {
                logFn('Warning: rate limiter used twice for this same request. Two suppress warnings like this, use verbose:false options.');
            }
        }

        workWithRedis(req, bigC.optz, bigC.client, resolve, reject);
    });

};




module.exports = Curtain;
