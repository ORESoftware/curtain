const suman = require('suman');
const Test = suman.init(module, {});


Test.describe.delay('@TestServer1', {}, function (request, suite, util) {

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
        server = require('../test-servers/server-2.js');
        server.on('listening', t.ctn);
    });

    this.it.cb('tests server', t => {

        request('http://localhost:9999', function (err, resp, body) {

            if (err) {
                t.fail(err);
            }
            else {
                if (resp.statusCode < 202) {
                    t.pass();
                }
                else {
                    err = new Error('Unexpected status code:' +
                        resp.statusCode + ', response body =>' + util.inspect(body));
                    t.fail(err);
                }
            }
        });
    });

    this.it.cb('tests server', {timeout: 3000}, t => {

        const interval = setInterval(function () {
            makeRequest();
        }, 50);

        t.once('done', function () {
            clearInterval(interval);
        });

        function makeRequest() {

            request('http://localhost:9999', function (err, resp, body) {

                console.log('body =>',body);

                if (err) {
                    t.done(err);
                }
                else {
                    if (resp.statusCode === 429) {
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
