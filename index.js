/**
 * Created by denman on 2/3/2016.
 */


    ///////////////////////////////////////////////

var Redis = require('ioredis');

///////////////////////////////////////////////////

/*
This is the simple version of this module that only rate limits requests by user/request id using Redis
*/

////////////////////////////////////////////////////


function Rate(conf) {
    if (conf.redis) {
        if (conf.redis.client) {
            this.client = conf.redis.client;
        }
        else {
            this.client = new Redis(conf.redis);
        }
    }
    else{
        throw new Error('No Redis configuration provided to Curtain module constructor');
    }
}


Rate.errors = Rate.prototype.errors = Object.freeze({
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

        if(!identifier || !key){
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
        else if(!periodMillis){
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