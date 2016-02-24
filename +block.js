/**
 * Created by amills001c on 2/5/16.
 */



///////////////////////////////////////////////

var async = require('async');
var Redis = require('ioredis');

///////////////////////////////////////////////////

/*

 This file is designed to both rate limit users, and if a particular user
 goes over another rate (assumed to be higher), then that user gets blocked for a
 certain time period.

 */

//////////////////////////////////////////////////

function Rate(conf) {
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
    'BLOCK_RATE_EXCEEDED': 'BLOCK_RATE_EXCEEDED',
    'REDIS_ERROR': 'REDIS_ERROR',
    'BAD_ARGUMENTS': 'BAD_ARGUMENTS'
});


Rate.prototype.limitAndOrBlock = function rateLimit(opts) {

    var maxReqsPerPeriod = opts.maxReqsPerPeriod ? parseInt(opts.maxReqsPerPeriod) : null;
    var periodMillis = opts.periodMillis ? parseInt(opts.periodMillis) : null;
    var identifier = opts.identifier ? String(opts.identifier) : null;
    var maxReqsBeforeBlock = opts.maxReqsPerPeriod ? parseInt(opts.maxReqsPerPeriod) : null;
    var blockPeriodMillis = opts.blockPeriodMillis ? parseInt(opts.blockPeriodMillis) : null;
    var blockForMillis = opts.blockForMillis ? parseInt(opts.blockForMillis) : null; //if user should be blocked, how long we should block them for

    return (req, res, next) => {


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
        else if (!maxReqsBeforeBlock) {
            next({
                type: Rate.errors.BAD_ARGUMENTS,
                msg: `opts.maxReqsBeforeBlock given as (${opts.maxReqsBeforeBlock}) was null/undefined or not a valid number`
            })
        }
        else if (!blockPeriodMillis) {
            next({
                type: Rate.errors.BAD_ARGUMENTS,
                msg: `opts.blockPeriodMillis given as (${opts.blockPeriodMillis}) was null/undefined or not a valid number`
            })
        }
        else if (blockPeriodMillis <= periodMillis) {
            next({
                type: Rate.errors.BAD_ARGUMENTS,
                msg: `opts.blockPeriodMillis given as (${opts.blockPeriodMillis}) was less than the value for opts.periodMillis (${opts.periodMillis})`
            })
        }
        else {

            var self = this;
            var now = Date.now();

            async.parallel([function (cb) {

                self.client.get(key, (err, result) => {

                    if (err) {
                        cb(null, {
                            error: {type: Rate.errors.REDIS_ERROR, msg: err.stack},
                            result: null
                        });
                    }
                    else if (result) {

                        result = JSON.parse(result).sort(function (a, b) {
                            return a - b; //we must run a sort by timestamp in case they are out of order, which may happen due to async nature
                        });

                        result.push(now); //always push timestamp of latest request

                        var length = result.length;
                        var error = null;

                        if (length >= maxReqsPerPeriod) {

                            var diff = now - result.shift();  // compare diff between now and oldest request time

                            if (diff <= periodMillis) {  //check if difference between newest request and oldest stored request is smaller than window
                                error = {
                                    type: Rate.errors.RATE_EXCEEDED,
                                    msg: 'Exceeded maxReqsPerPeriod=' + maxReqsPerPeriod + ' requests per second'
                                };
                            }

                            if (diff <= blockPeriodMillis) {  //check if difference between newest request and oldest stored request is smaller than window
                                error = {
                                    type: Rate.errors.BLOCK_RATE_EXCEEDED,
                                    msg: 'Exceeded maxReqsBeforeBlock=' + maxReqsBeforeBlock + ' requests per second'
                                };
                            }

                        }
                        cb(null, {
                            error: error, result: JSON.stringify(result)
                        });
                        //redisSet(error, this.client, JSON.stringify(result));
                    }
                    else {
                        // setting new value in redis
                        cb(null, {
                            error: null, result: JSON.stringify([Date.now()])
                        });
                        //redisSet(null, this.client, JSON.stringify([Date.now()]));
                    }

                });

            }, function (cb) {

                this.client.get('blocked-users', (err, result) => {

                    if (err) {
                        cb(null, {
                            error: {type: Rate.errors.REDIS_ERROR, msg: err.stack}
                        });
                    }
                    else {
                        var isBlocked = null;

                        for (var i = 0; i < result.length; i++) {
                            var res = result[i];
                            if (String(res.key) === String(key)) {
                                isBlocked = (res.value > now);  //if res.value is <= now, we set isBlocked to false
                                break;
                            }
                        }

                        if (isBlocked === false) {
                            result.splice(i, 1);  //take out that element from the array
                        }

                        cb(null, {
                            error: null,
                            result: {
                                isBlocked: isBlocked,
                                result: result
                            }
                        });
                    }

                });


            }], function complete(err, results) {

                if (err) {
                    next(err);  //this should not happen
                }
                else {

                    var res0Error = results[0].error;
                    var res1Error = results[1].error;
                    var res0Result = results[0].result;
                    var res1Result = results[1].result;

                    var rateExceeded = res0Error ? res0Error.type === Rate.errors.RATE_EXCEEDED : null;
                    var shouldBeBlocked = res0Error ? res0Error.type === Rate.errors.BLOCK_RATE_EXCEEDED : null;

                    async.parallel([function updateRateKey(cb) {

                        if ((!res0Error || rateExceeded) && res0Result) {
                            self.client.set(key, res0Result, err => {
                                if (err) {
                                    cb(null, {
                                        error: {type: Rate.errors.REDIS_ERROR, msg: err}
                                    });
                                }
                                else {
                                    self.client.expire(key, Math.ceil(periodMillis / 1000) + 5); // expire the key at least 5 seconds after, we don't handle an error here
                                    cb(null); //if there's an error, send it on
                                }
                            });
                        }
                        else {
                            cb(null, res0Error);
                        }

                    }, function updateBlockedUsersKey(cb) {

                        if ((!res1Error || shouldBeBlocked) && res1Result) {

                            if(shouldBeBlocked){
                                if(true){
                                    //TODO start fixing this
                                }
                            }

                            self.client.set('blocked-users', value, err => {
                                if (err) {
                                    cb(null, {
                                        error: {type: Rate.errors.REDIS_ERROR, msg: err}
                                    });
                                }
                                else {
                                    //we don't expire the blocked-users Redis key
                                    cb(null);
                                }
                            });
                        }
                        else {
                            cb(null, res1Error);
                        }
                    }], function complete(err, results) {

                        if (err) {
                            next(err); // this should not happen either
                        }
                        else {

                            var res0Error = results[0].error;
                            var res1Error = results[1].error;
                            var res0Result = results[0].result;
                            var res1Result = results[1].result;


                        }

                    });

                }


            });


        }

    }


};


module.exports = Rate;