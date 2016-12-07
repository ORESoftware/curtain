'use strict';

//core
const assert = require('assert');

//project
const debug = require('debug')('curtain');

module.exports = function setOptions($opts) {

    const opts = {};

    opts.req = $opts.req || null;
    opts.maxReqsPerPeriod = $opts.maxReqsPerPeriod ? parseInt($opts.maxReqsPerPeriod) : null;
    opts.periodMillis = $opts.periodMillis ? parseInt($opts.periodMillis) : null;
    opts.identifier = $opts.identifier ? String($opts.identifier) : null;


    const logFn = opts.logFn = $opts.log || debug;
    assert.equal(typeof logFn, 'function', ' => Curtain library usage error => "logFn" option must be a function.');


    const excludeRoutes = opts.excludeRoutes = $opts.excludeRoutes ? JSON.parse(JSON.stringify($opts.excludeRoutes)) : null;
    const includeRoutes = opts.includeRoutes = $opts.includeRoutes ? JSON.parse(JSON.stringify($opts.includeRoutes)) : null;

    if (includeRoutes) {
        assert(Array.isArray(includeRoutes), ' => Curtain usage error => ' +
            '"includeRoutes" option needs to point to an array.');
        if (includeRoutes.length > 0) {
            opts.isIncludeOnly = true;
        }
    }
    if (excludeRoutes) {
        assert(Array.isArray(excludeRoutes), ' => Curtain usage error => ' +
            '"excludeRoutes" option needs to point to an array.');
    }

    if (excludeRoutes && excludeRoutes.length > 0) {
        opts.excludeRoutesRegexp = pathToRegexp(excludeRoutes);
    }
    if (includeRoutes && includeRoutes.length > 0) {
        opts.includeOnlyRoutesRegexp = pathToRegexp(includeRoutes);
    }

    return opts;

};