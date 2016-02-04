/**
 * Created by denman on 2/3/2016.
 */
/**
 * Created by denman on 2/3/2016.
 */


var debug = require('debug')('curtain:core');
var Redis = require('ioredis');
var ijson = require('idempotent-json');

function Rate(conf) {
    this.client = new Redis(conf.redis);
}


Rate.errors = {

    'NO_KEY': 'no key was available to find the request.',
    'RATE_EXCEEDED': 'rate exceeeded',
    'REDIS_ERROR': 'Redis error'

};

Rate.prototype.limit = function rateLimit(opts) {

    var maxReqsPerPeriod = opts.maxReqsPerPeriod || 30;
    var periodMillis = opts.periodMillis || 1000;

    return (req, res, next) => {

        var key = String(req.ip);

        debug('ip address:', key);

        if (!key) {
            next({error: Rate.errors.NO_KEY});
        }
        else {

            this.client.get(key, (err, result) => {

                if (err) {
                    next({error: Rate.errors.REDIS_ERROR});
                }
                else if (result) {

                    result = ijson.parse(result).sort(function (a, b) {

                        a = parseInt(a);
                        b = parseInt(b);

                        return a - b; //we run a sort by timestamp in case they are out of order, which may happen due to async nature
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
                            error = {error: 'Exceeded ' + maxReqsPerPeriod + ' requests per second for XRE events'};
                        }
                    }

                    debug('result array:', result);

                    this.client.set(key, JSON.stringify(result), err => {
                        if (err) {
                            next({error: Rate.errors.REDIS_ERROR});
                        }
                        else {
                            this.client.expire(key, Math.ceil(periodMillis / 1000) + 5); // expire the key at least 5 seconds after
                        }

                    });

                }
                else {
                    debug('setting key for first time.');
                    this.client.set(key, JSON.stringify([Date.now()]));
                    next();
                }

            });
        }

    }


};


module.exports = Rate;