

### Curtain

This library serves as Express middleware designed to make a yes/no decision about whether to admit a request or to determine that
a request has exceeed a threshold and should be rejected with a HTTP 429 or other relevant HTTP response.

## Usage



const RateLimiter = require('curtain');

var rlm = new RateLimiter({
    redis: {
        port: 6379,
        host: '127.0.0.1',
        db: 0
    }
});



app.use(rlm.limit({

    maxReqsPerPeriod: 150,
    periodMillis: 3000

}), function limitExceeded(err, req, res, next) {

    log.debug({msg: 'request was rejected because it exceeded the rate limit'});
    next(err);

}, function requestIsOk(req, res, next) {

    next();
});
