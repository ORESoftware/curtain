////////////* this lib *////////////

const RateLimiter = require('../../');

///////////////////////////////////

//core
const http = require('http');
const util = require('util');

//npm
const express = require('express');

///////////////////////////////////


const app = express();
app.set('port', 9999);


const rlm = new RateLimiter({
    redis: {
        host: '127.0.0.1',
        port: 6379
    }
});


app.use(function (req, res, next) {

    rlm.limit({

        req: req,
        excludeRoutes: [],
        maxReqsPerPeriod: 5,
        periodMillis: 2000,
        identifier: 'ip'

    }).then(function (data) {

        if (data.rateExceeded) {
            res.status(429).json({error: 'Rate limit exceeded'});
        } else {
            next();
        }

    }, function (err) {

        if (!err.curtainError) {  //this error is not from the curtain library, pass it on
            return next(err);
        }

        switch (err.type) {
            case rlm.errors.REDIS_ERROR:
                err.status = 500;
                break;
            case rlm.errors.NO_KEY: // whatever you chose to use as you're request unique identifier, there was a problem finding it
                err.status = 500;
                break;
            case rlm.errors.BAD_ARGUMENTS: //if you have some dynamicism in your project, then maybe you could pass bad args at runtime
                err.status = 500;
                break;
            default:
                throw new Error('Unexpected err via rate limiter:' + err);
        }

        next(err);

    });

});


app.use(function (req, res) {
    res.json({success: 'request did not exceed rate limit.'});
});

app.use(function (err, req, res, next) {
    res.json({error: 'this code should never be reached => ' + util.inspect(err.stack || err)});
});


module.exports = http.createServer(app).listen(app.get('port'));
