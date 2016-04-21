/**
 * Created by amills001c on 4/13/16.
 */


const suman = require('/Users/amills001c/WebstormProjects/oresoftware/suman');
const Test = suman.init(module,{});


Test.describe('SimpleTest', function (assert, fs, os) {


    this.it('tests-arrays', function () {
        assert.equal(typeof [], 'object');
    });


    ['describe', 'it', 'before', 'after', 'afterEach'].forEach(item => {

        this.it('tests-suman suite block for: ' + item, function () {
            assert(this.hasOwnProperty(item));
        });

    });

    this.it('Check that Test.file is equiv. to module.filename', {timeout: 20}, done => {
        setTimeout(function () {
            assert(module.filename === Test.file);
            done();
        }, 18);
    });


    this.it('reads this file, pipes to /dev/null', function (fail, pass) {

        const destFile = os.hostname === 'win32' ? process.env.USERPROFILE + '/temp' : '/dev/null';

        fs.createReadStream(Test.file).pipe(fs.createWriteStream(destFile))
            .on('error', fail).on('finish', pass);

    });


});



