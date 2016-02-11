/**
 * Created by denman on 2/7/2016.
 */


////////////* this lib *////////////

var RateLimiter = require('../../');

///////////////////////////////////

var http = require('http');
var express = require('express');

///////////////////////////////////


var app = express();
app.set('port', 9999);



var rlm = new RateLimiter({
    redis: {
        host: '127.0.0.1',
        port: 6379
    }
});

app.use(rlm.limit({
    identifier: 'ip',
    periodMillis: 1000,
    maxReqsPerPeriod: 10

}), function (err, req, res, next) {
    res.json(err);

}, function (req, res, next) {
    res.json({success: true});
});


app.use(function (req, res) {
    res.json({error: 'this code should never be reached.'});
});



module.exports = http.createServer(app).listen(app.get('port'));
