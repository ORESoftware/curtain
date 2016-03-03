/**
 * Created by amills001c on 2/8/16.
 */



var async = require('async');


function returnsPromise(){
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve({temp: 'A'});
        }, 1000);
    });
}

module.exports = function loadAsyncDepsForSuman(suman, cb) {

    suman.configure({

        'request': function () {

            return require('request');
            //setTimeout(function () {
            //    cb(null,
            //        require('request')
            //    );
            //}, 1000);

        },
        'ioredis': function (cb) {

            setTimeout(function () {
                cb(null,
                    require('ioredis')
                );
            }, 1000);
        },

        'didj': function () {

            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve({temp: 'A'});
                }, 1000);
            });

        },
        'mark': async function () {
            return await returnsPromise();
        }

    });

};