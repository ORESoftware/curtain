'use strict';

//core
const assert = require('assert');

//project
const debug = require('debug')('curtain');

module.exports = function setOptions(opts) {

    const optz = {};

    const req = optz.req = opts.req || null;
    const logFn = optz.logFn = opts.log || debug;
    const maxReqsPerPeriod = optz.maxReqsPerPeriod = opts.maxReqsPerPeriod ? parseInt(opts.maxReqsPerPeriod) : null;
    const periodMillis = optz.periodMillis = opts.periodMillis ? parseInt(opts.periodMillis) : null;
    const identifier = optz.identifier = opts.identifier ? String(opts.identifier) : null;
    const excludeRoutes = optz.excludeRoutes = opts.excludeRoutes ? JSON.parse(JSON.stringify(opts.excludeRoutes)) : null;
    const includeRoutes = optz.includeRoutes = opts.includeRoutes ? JSON.parse(JSON.stringify(opts.includeRoutes)) : null;

    assert.equal(typeof logFn, 'function', ' => Curtain library usage error => "logFn" option must be a function.');

    if (includeRoutes) {
        assert(Array.isArray(includeRoutes), ' => Curtain usage error => ' +
            '"includeRoutes" option needs to point to an array.');
        if (includeRoutes.length > 0) {
            optz.isIncludeOnly = true;
        }
    }
    if (excludeRoutes) {
        assert(Array.isArray(excludeRoutes), ' => Curtain usage error => ' +
            '"excludeRoutes" option needs to point to an array.');
    }

    if (excludeRoutes && excludeRoutes.length > 0) {
        optz.excludeRoutesRegexp = pathToRegexp(excludeRoutes);
    }
    if (includeRoutes && includeRoutes.length > 0) {
        optz.includeOnlyRoutesRegexp = pathToRegexp(includeRoutes);
    }

    return optz;

};