/**
 * Created by denman on 2/7/2016.
 */


//var suman = require('suman');
var suman = require('/Users/amills001c/WebstormProjects/ORESoftware/suman');
//var suman = require('C:\\Users\\denman\\WebstormProjects\\suman');
var Test = suman.Test(module, 'suman.conf.js');


Test.describe('@TestServer1', {


},['ioredis', 'request'], function () {


    /////////////////////////////////////

    var request = require('request');
    var server = null;


    ////////////////////////////////////


    this.before('(start redis)', function (done) {
        done();
    });

    this.before('(stop any server running)', function (done) {

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

            console.log('body:', body);

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