const suman = require('suman');
const Test = suman.init(module, {});


Test.describe.delay('@TestServer1', {}, function (request) {

    var server = null;

    const suite = this;

    setTimeout(function () {
        suite.resume();
    }, 1000);


    this.before.cb('(start redis)', t => {
        t.done();
    });

    this.before.cb('(stop any server running)', t => {
        t.done();
    });

    this.before.cb('(start server)', t => {
        server = require('./test-servers/server-2.js');
        server.on('listening', t.ctn);
    });

    this.it.cb('tests server', t => {

        request('http://localhost:9999', function (err, resp, body) {

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


    this.it.cb('tests server again', t => {
        t.done();
    });


    this.after.cb('shutdown-server', h => {
        console.log('closing server');
        server.once('close', h.ctn);
        server.close();
    });
});
