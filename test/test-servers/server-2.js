
//core
const util = require('util');
const http = require('http');

//npm
const express = require('express');


//this lib
const RateLimiter = require('../../');

///////////////////////////////////

const app = express();
app.set('port', 9999);


const rlm = new RateLimiter({
    redis: {
        host: '127.0.0.1',
        port: 6379
    }
});


app.use(rlm.limitMiddleware({

    excludeRoutes: [],
    maxReqsPerPeriod: 15,
    periodMillis: 2000,
    identifier: 'ip'

}), function (err, req, res, next) {

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
            const $err = err.stack || err;
            console.error('Unexpected err via rate limiter:', typeof $err === 'string'? $err : util.inspect($err));
    }

    next(err);

});


app.use(function (req, res) {
    res.json({error: 'this code should never be reached.'});
}, function(req,res,next){
    throw new Error('nope');
});


app.use(function (err, req, res, next) {
    res.json({error: 'this code should never be reached => ' + util.inspect(err.stack || err)});
}, function(req,res,next){
    throw new Error('nope');
});


module.exports = http.createServer(app).listen(app.get('port'));
