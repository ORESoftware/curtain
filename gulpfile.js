/**
 * Created by amills001c on 2/11/16.
 */



//core
var gulp = require('gulp');
var path = require('path');
var fs = require('fs');
var async = require('async');

//gulp plugins
var babel = require('gulp-babel');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var rename = require('gulp-rename');

//args & env
var argv = process.env.argv;
var $node_env = process.env.NODE_ENV;




gulp.task('transpile', [], function () {
    return gulp.src(['suman.ioc.b4.js'])
        .pipe(rename('suman.ioc.js'))
        .pipe(babel())
        .pipe(gulp.dest('.'));
});