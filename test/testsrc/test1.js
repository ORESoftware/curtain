const suman = require('suman');
const Test = suman.init(module, {});


Test.create.delay('@TestServer1', {}, function (request, suite, assert) {

    var server = null;

    setTimeout(function () {
        suite.resume();
    }, 100);


    this.before.cb('(start redis)', t => {
        t.done();
    });

    this.before.cb('(stop any server running)', t => {
        t.done();
    });

    this.before.cb('(start server)', t => {
        server = require('../test-servers/server-1.js');
        server.on('listening', t.ctn);
    });

    this.it.cb('tests server A', t => {

        request('http://localhost:9998', function (err, resp, body) {

            if (err) {
                t.done(err);
            }
            else {
                if (resp.statusCode < 202) {
                    t.done();
                }
                else {
                    t.done(new Error(resp.statusCode));
                }
            }
        });
    });


    this.it.skip.cb('tests server B', {timeout: 6000}, t => {

        const interval = setInterval(function () {
            makeRequest();
        }, 10);

        t.once('done', function () {
            clearInterval(interval);
        });


        function makeRequest() {

            request('http://localhost:9998', function (err, resp, body) {

                console.log('body =>', body);

                body = JSON.parse(body);

                const count = body.length;

                if (err) {
                    t.done(err);
                }
                else {
                    if (resp.statusCode === 429) {
                        assert.equal(count, 5);
                        t.done();
                    }
                }
            });
        }

    });


    this.it.cb('tests server B', {timeout: 6000}, t => {

        var keepLooping = true;
        (function ontimeout(){
            if(keepLooping){
                makeRequest();
                setTimeout(ontimeout, Math.random() * 50);
            }
        })();


        t.once('done', function () {
            keepLooping = false;
        });

        function makeRequest() {

            request('http://localhost:9998', function (err, resp, body) {

                console.log('body =>', body);

                body = JSON.parse(body);

                const count = body.length;

                if (err) {
                    t.done(err);
                }
                else {
                    if (resp.statusCode === 429) {
                        assert.equal(count, 12);
                        t.done();
                    }
                }
            });
        }

    });

    this.it.cb('tests server again', t => {
        t.done();
    });


    this.after.cb('shutdown-server', h => {
        console.log('closing server');
        server.once('close', h.ctn);
        server.close();
    });
});
