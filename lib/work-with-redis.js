function redisSet(rateExceeded, client, key, value, periodMillis, resolve, reject) {

    const Curtain = require('..');

    client.set(key, value, err => {

        client.expire(key, Math.ceil(periodMillis / 1000) + 5); // expire the key at least 5 seconds after

        if (err) {
            console.error(err.stack || err);
        }

        if (rateExceeded) {
            resolve({
                rateExceeded: true,
                routeExcluded: false
            });
        }
        else {
            resolve({
                rateExceeded: false,
                routeExcluded: false
            });
        }

    });
}

module.exports = function workWithRedis(req, optz, client, resolve, reject) {

    const Curtain = require('..');
    const {identifier, maxReqsPerPeriod, periodMillis} = optz;

    var key = String(req[identifier]);

    if (!identifier || !key) {
        reject({
            curtainError: true,
            type: Curtain.errors.BAD_ARGUMENTS,
            error: new Error(`opts.identifier given as (${opts.identifier}) could not produce a valid result from the req object`)
        })
    } else if (!maxReqsPerPeriod) {
        reject({
            curtainError: true,
            type: Curtain.errors.BAD_ARGUMENTS,
            error: new Error(`opts.periodMillis given as (${opts.periodMillis}) was null/undefined or not a valid number`)
        })
    } else if (!periodMillis) {
        reject({
            curtainError: true,
            type: Curtain.errors.BAD_ARGUMENTS,
            error: new Error(`opts.maxReqsPerPeriod given as (${opts.maxReqsPerPeriod}) was null/undefined or not a valid number`)
        })
    } else {

        client.get(key, (err, result) => {
            if (err) {
                reject({
                    curtainError: true,
                    type: Curtain.errors.REDIS_ERROR,
                    error: err
                });
            } else if (result) {

                result = JSON.parse(result).sort(function (a, b) {
                    return a - b; //we must run a sort by timestamp in case they are out of order, which may happen due to async nature
                });

                var now = Date.now();
                result.push(now); //always push timestamp of latest request

                var length = result.length;
                var rateExceeded = null;

                if (length > (maxReqsPerPeriod + 1)) {

                    var diff = now - result.shift(); // compare diff between now and oldest request time

                    //check if difference between newest request and oldest stored request is smaller than window
                    if (diff <= periodMillis) {
                        req.curtain.rateExceeded = true;
                        rateExceeded = {
                            curtainError: true,
                            type: Curtain.errors.RATE_EXCEEDED,
                            error: new Error('Exceeded ' + maxReqsPerPeriod + ' requests per time period of ' + periodMillis + 'ms')
                        };
                    }
                }

                redisSet(rateExceeded, client, key, JSON.stringify(result), periodMillis, resolve, reject);

            } else {
                // setting new value in redis
                redisSet(null, client, key, JSON.stringify([Date.now()]), periodMillis, resolve, reject);
            }
        });
    }
};
