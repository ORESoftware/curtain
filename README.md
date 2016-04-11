

# Curtain

This library is designed to make a yes/no decision about whether to admit a request or to determine that
a request has exceeed a threshold and should be rejected with a HTTP 429 or other relevant HTTP response.

<br />

[![NPM](https://nodei.co/npm/curtain.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/curtain/)

<br />

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


module.exports = function(req, res, next) {

    rlm.limit({

        req: req,
        log: log.debug.bind(log),
        excludeRoutes: ['/v1/posts/by_id/:id/add_upvote', '/v1/posts/by_id/:id/remove_upvote', '/v1/handle/blacklisted'],
        maxReqsPerPeriod: 15,
        periodMillis: 2000,
        identifier: 'ip'

    }).then(function(data) {

        if (data.rateExceeded) {
            res.status(429).json({ error: 'Rate limit exceeded' });
        } else {
            next();
        }

    }, function(err) {

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
                log.warn('Unexpected err via rate limiter:', err);
        }

        next(err);

    });


};

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