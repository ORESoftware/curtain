function _asyncToGenerator(fn) {
    return function () {
        var gen = fn.apply(this, arguments);
        return new Promise(function (resolve, reject) {
            function step(key, arg) {
                try {
                    var info = gen[key](arg);
                    var value = info.value;
                } catch (error) {
                    reject(error);
                    return;
                }
                if (info.done) {
                    resolve(value);
                } else {
                    return Promise.resolve(value).then(function (value) {
                        return step("next", value);
                    }, function (err) {
                        return step("throw", err);
                    });
                }
            }

            return step("next");
        });
    };
}


/**
 * Created by amills001c on 2/8/16.
 */

var async = require('async');

function returnsPromise() {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve({temp: 'A'});
        }, 1000);
    });
}

module.exports = suman => {

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
                cb(null, require('ioredis'));
            }, 1000);
        },

        'didj': function () {

            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve({temp: 'A'});
                }, 1000);
            });
        },
        'markj': function () {
            var ref = _asyncToGenerator(function* () {
                return yield returnsPromise();
            });

            return function mark() {
                return ref.apply(this, arguments);
            };
        }()

    });
};