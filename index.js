/**
 * Created by denman on 2/3/2016.
 */
/**
 * Created by denman on 2/3/2016.
 */



var Redis = require('ioredis');
var ijson = require('idempotent-json');

function Rate(conf) {

    this.client = new Redis(conf.redis);


}


Rate.prototype.rateLimit = function rateLimit(opts) {

    var self = this;

    var maxRequests = self.maxRequests || 50;
    var maxRequestsTime = self.maxRequestsTime || 1000;

    return function (req, res, next) {

        var key = req.ip;

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
                        return a - b;
                    });

                    var now = Date.now();
                    result.push(now); //push timestamp of latest request

                    var length = result.length;

                    var old, error = null;

                    if (length >= maxRequests) {
                        old = result.shift();  // get the oldest request time and examine it
                        if (now - old <= maxRequestsTime) {
                            error = {error: 'Exceeded 50 requests per second for XRE events'};
                        }
                    }

                    self.client.set(key, result);
                    next(error);

                }
                else {
                    self.client.set(key, [Date.now()]);
                    next();
                }

            });
        }

    }


};


module.exports = Rate;