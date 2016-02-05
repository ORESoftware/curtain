/**
 * Created by denman on 2/3/2016.
 */


var Redis = require('ioredis');

///////////////////////////////////////////////////


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


        function redisSet(error, client, value) {

            client.set(key, value, err => {
                if (err) {
                    next({type: Rate.errors.REDIS_ERROR, msg: err});
                }
                else {
                    client.expire(key, Math.ceil(periodMillis / 1000) + 5); // expire the key at least 5 seconds after
                    next(error); //if there's an error, send it on
                }
            });
        }

        var key = String(req[identifier]);

        if (!maxReqsPerPeriod || !periodMillis || !identifier || !key) {
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
                    result.push(now); //always push timestamp of latest request

                    var length = result.length;
                    var old, error = null;

                    if (length >= maxReqsPerPeriod) {

                        old = result.shift();  // get the oldest request time and examine it
                        var diff = now - old;

                        if (diff <= periodMillis) {  //check if difference between newest request and oldest stored request is smaller than window
                            error = {
                                type: Rate.errors.RATE_EXCEEDED,
                                msg: 'Exceeded ' + maxReqsPerPeriod + ' requests per second for XRE events'
                            };
                        }
                    }

                    redisSet(error, this.client, JSON.stringify(result));

                }
                else {
                    // setting new value in redis
                    redisSet(null, this.client, JSON.stringify([Date.now()]));
                }

            });
        }

    }


};


module.exports = Rate;