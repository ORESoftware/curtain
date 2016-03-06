/**
 * Created by denman on 2/7/2016.
 */


//var suman = require('suman');

var suman = require('/Users/amills001c/WebstormProjects/ORESoftware/suman');
//var suman = require('C:\\Users\\denman\\WebstormProjects\\suman');

//var suman = require('C:\\Users\\denman\\WebstormProjects\\suman');
//var suman = require('/Users/amills001c/WebstormProjects/ORESoftware/suman');
var Test = suman.init(module, 'suman.conf.js');


Test.describe('@TestServer1', [], function (delay, request, ioredis, didj) {

    var server = null;

    setTimeout(function () {
        delay();
    }, 1000);


    this.before('(start redis)', function (done, a, t) {
        done();
    });

    this.before('(stop any server running)', function (a, t, b, done) {
        done();
    });

    this.before('(start server)', function (done) {
        server = require('./test-servers/server-1.js');
        server.on('listening', function () {
            done();
        });
    });

    this.it('tests server', function (t, done) {

        request('http://localhost:9999', function (err, resp, body) {

            if (err) {
                done(err);
            }
            else {
                if (resp.statusCode < 202) {
                    done();
                }
                else {
                    done(new Error(resp.statusCode));
                }
            }
        });
    });


    this.it('tests server again', function () {


    });


});
