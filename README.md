

### Curtain

This library serves as Express middleware designed to make a yes/no decision about whether to admit a request or to determine that
a request has exceeed a threshold and should be rejected with a HTTP 429 or other relevant HTTP response.

## Usage

(See the /test folder in the project for more examples)


```javascript

const RateLimiter = require('curtain');

var rlm = new RateLimiter({
    redis: {
        port: 6379,
        host: '127.0.0.1',
        db: 0
    }
});


app.use(rlm.limit({

    maxReqsPerPeriod: 150,          // maximum number of requests that are allowed to occur during a window
    periodMillis: 3000,             // the window period in milliseconds
    identifier: 'ip'                // string representing what value to read off the req object
    

}), function requestLimitExceeded(err, req, res, next) {

    //some error occured, most likely an error representing that the request rate was exceeded by the latest request
    next(err);

}, function requestIsOk(req, res, next) {

    //the new request is within limits
    next();
});

```


you can also pass in an existing Redis client like so:


```javascript
const RateLimiter = require('curtain');

var rlm = new RateLimiter({
    redis: {
        client: yourClient 
    }
});
```

Note: This library calls your error handling middleware. When the rate limit is exceeded by the newest request 
it will call your promixate error handling middleware; this same middleware will also be called if any other types of errors occur. 
All errors (whether they are Redis errors or rate limit errors) should be handled by you like this:

```javascript
app.use(rlm.limit({

    maxReqsPerPeriod: 150,
    periodMillis: 3000,
    identifier: 'ip'

}), function curtainErrorOccurred(err, req, res, next) {

        switch (err.type) {  
            case rlm.errors.RATE_EXCEEDED:  //Rate has been exceeeded, do with this as you will
                res.set('Retry-After',2);
                return res.status(429).json({error: 'Request rate exceeded limit.'});
            case rlm.errors.REDIS_ERROR:
                return next(err);
            case rlm.errors.NO_KEY:  // whatever you chose to use as your request unique identifier, there was a problem finding it on the request stream object
                return next(err);
            case rlm.errors.BAD_ARGUMENTS:  //if you have some dynamicism in your project, then it's possible that you could pass bad args at some point in runtime
                return next(err);
            default:
                next(new Error('The NPM curtain library broke because it sent an unexpected error, what a POS'))
        }

}, function requestIsOk(req, res, next) {

    next();
    
});
```
<br />
<br />
<br />
If you don't use the ip value of req.ip, (which you probably shouldn't) then you need to attach a value to req representing 
the key to use for that user that is making the request.

That might look like this:

```javascript


app.use(function(req,res,next){

   req['foo-bar'] = 'some-unique-request-id-for-your-app';
   next();

}, rlm.limit({

    maxReqsPerPeriod: 150,          // maximum number of requests that are allowed to occur during a window
    periodMillis: 3000,             // the window period in milliseconds
    identifier: 'foo-bar'           // string representing what value to read off the req object
    

}), function requestLimitExceeded(err, req, res, next) {

    //some error occured, most likely an error representing that the request rate was exceeded by the latest request
    next(err);

}, function requestIsOk(req, res, next) {

    //the new request is within limits
    next();
});

```