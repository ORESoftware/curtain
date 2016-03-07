/**
 * Created by denman on 2/13/2016.
 */

var test = require('tape');

test('timing test', function (t) {

    t.plan(2);

    t.equal(typeof Date.now, 'function');
    var start = Date.now();

    setTimeout(function () {
        t.equal(Date.now() - start, 100);
    }, 100);

});