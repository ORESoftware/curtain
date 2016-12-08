

# Curtain

This library is designed to make a yes/no decision about whether to admit a request or to determine that
a request has exceeed a threshold and should be rejected with a HTTP 429 or other relevant HTTP response.

<br />

[![NPM](https://nodei.co/npm/curtain.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/curtain/)

<br />

## Usage

(See the /test folder in the project for more examples)


```javascript

// import the code
const RateLimiter = require('curtain');

// initialize a new rlm instance (only really need one per redis connection)
const rlm = new RateLimiter({
    redis: {
        port: 6379,
        host: '127.0.0.1',
        db: 0
    }
});


 // promise based interface
app.use(function (req, res, next) {

    rlm.limit({

        req: req,
        excludeRoutes: [],
        maxReqsPerPeriod: 10,
        periodMillis: 1000,
        identifier: 'ip'

    }).then(function (data) {

        if (data.rateExceeded) {
            res.status(429).json({error: 'Rate limit exceeded', length: data.length});
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


// middleware based interface
 app.use(rlm.limitMiddleware({
 
     excludeRoutes: [],
     maxReqsPerPeriod: 5,
     periodMillis: 2000,
     identifier: 'ip'
 
 }), function (err, req, res, next) {
 
     if (!err.curtainError) {  //this error is not from the curtain library, pass it on
         console.log('zzzz');
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
             throw new Error('Unexpected err via rate limiter XXX:' + typeof (err.stack || err) === 'string' ?
                 (err.stack || err) : util.inspect(err));
     }
 
     next(err);
 
 }, function(req,res,next){
 
     if(req.curtain.rateExceeded){
         res.status(429).json({error: 'Rate limit exceeded'});
     }
     else{
         next();
     }
 
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

<br />
<br />
<br />

If you don't use the ip value of req.ip, (which you probably shouldn't) then you need to attach a value to req representing 
the key to use for that user that is making the request.

That might look like this:

```javascript

req['foo-bar'] = 'some-unique-request-id-for-your-app';


rlm.limit({

    req: req,
    maxReqsPerPeriod: 150,          // maximum number of requests that are allowed to occur during a window
    periodMillis: 3000,             // the window period in milliseconds
    identifier: 'foo-bar'           // string representing what value to read off the req object
    
})

```