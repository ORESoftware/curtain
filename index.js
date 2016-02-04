/**
 * Created by denman on 2/3/2016.
 */
/**
 * Created by denman on 2/3/2016.
 */


var log = require('baymax-logger');
var Redis = require('ioredis');
var ijson = require('idempotent-json');

function Rate(conf) {

    this.client = new Redis(conf.redis);

}


Rate.prototype.limit = function rateLimit(opts) {

    var self = this;

    var maxRequests = opts.maxRequests || 3;
    var maxRequestsTime = opts.maxRequestsTime || 1000;

    return function (req, res, next) {

        var key = String(req.ip);

        log.debug('ip address:', key);

        if (!key) {
            next();
        }
        else {

            self.client.get(key, function (err, result) {

                if (err) {
                    next(err);
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

                    if (length > maxRequests) {

                        old = result.shift();  // get the oldest request time and examine it

                        var diff = now - old;

                        log.debug('diff:', diff);

                        if (diff <= maxRequestsTime) {
                            error = {error: 'Exceeded 50 requests per second for XRE events'};
                        }
                    }

                    log.debug('result array:', result);

                    self.client.set(key, JSON.stringify(result));
                    next(error);

                }
                else {
                    log.debug('setting key for first time.');
                    self.client.set(key, JSON.stringify([Date.now()]));
                    next();
                }

            });
        }

    }


};


module.exports = Rate;