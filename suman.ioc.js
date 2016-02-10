/**
 * Created by amills001c on 2/8/16.
 */



var async = require('async');


module.exports = function loadAsyncDepsForSuman(suman, cb) {

    suman.configure({

        'request': function (cb) {

            setTimeout(function () {
                cb(null,
                    require('request')
                );
            }, 1000);

        },
        'ioredis': function (cb) {

            setTimeout(function () {
                cb(null,
                    require('ioredis')
                );
            }, 1000);
        }

    });

};