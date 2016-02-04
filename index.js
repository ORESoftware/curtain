/**
 * Created by denman on 2/3/2016.
 */
/**
 * Created by denman on 2/3/2016.
 */


var debug = require('debug')('curtain:core');
var Redis = require('ioredis');

function Rate(conf) {
    if (conf.redis) {
        if (conf.redis.client) {
            this.client = conf.redis.client;
        }
        else {
            this.client = new Redis(conf.redis);
        }
    }
}


Rate.errors = Rate.prototype.errors = Object.freeze({  //TODO Object.freeze may prevent syntax highlighting..

    'NO_KEY': 'NO_KEY',
    'RATE_EXCEEDED': 'RATE_EXCEEDED',
    'REDIS_ERROR': 'REDIS_ERROR',
    'BAD_ARGUMENTS': 'BAD_ARGUMENTS'

});

Rate.prototype.limit = function rateLimit(opts) {

    var maxReqsPerPeriod = opts.maxReqsPerPeriod ? parseInt(opts.maxReqsPerPeriod) : null;
    var periodMillis = opts.periodMillis ? parseInt(opts.periodMillis) : null;
    var identifier = opts.identifier ? String(opts.identifier) : null;

    return (req, res, next) => {

        var key = String(req[identifier]);

        debug('ip address:', key);

        if (!maxReqsPerPeriod || !periodMillis || !identifier) {
            next({
                type: Rate.errors.BAD_ARGUMENTS,
                msg: `either opts.maxReqsPerPeriod (${opts.maxReqsPerPeriod}) or opts.periodMillis (${opts.periodMillis}) was null/undefined or not a valid number`
            })
        }
        else if (!key) {
            next({type: Rate.errors.NO_KEY, 'msg': 'no key was available to find the request.'});
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
                    result.push(now); //push timestamp of latest request

                    var length = result.length;

                    var old, error = null;

                    if (length > maxReqsPerPeriod) {

                        old = result.shift();  // get the oldest request time and examine it

                        var diff = now - old;

                        debug('diff:', diff);

                        if (diff <= periodMillis) {
                            error = {
                                type: Rate.errors.RATE_EXCEEDED,
                                msg: 'Exceeded ' + maxReqsPerPeriod + ' requests per second for XRE events'
                            };
                        }
                    }

                    debug('result array length:', result.length);
                    this.client.set(key, JSON.stringify(result), err => {
                        if (err) {
                            next({type: Rate.errors.REDIS_ERROR, msg: err});
                        }
                        else {
                            this.client.expire(key, Math.ceil(periodMillis / 1000) + 5); // expire the key at least 5 seconds after
                            next(error); //TODO, we need to handle the case when a redis error occurs *and* an RATE_EXCEEDED error occurs
                        }
                    });

                }
                else {
                    debug('setting key for first time.');
                    this.client.set(key, JSON.stringify([Date.now()]), err => {
                        if (err) {
                            next({type: Rate.errors.REDIS_ERROR, msg: err});
                        }
                        else {
                            this.client.expire(key, Math.ceil(periodMillis / 1000) + 5); // expire the key at least 5 seconds after
                            next();
                        }
                    });
                }

            });
        }

    }


};


module.exports = Rate;