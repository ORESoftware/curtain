'use strict';



module.exports = function filterIncludeExclude(optz, pathname) {

    const {isIncludeOnly, includeOnlyRoutesRegexp, logFn, excludeRoutesRegexp} = optz;

    if (isIncludeOnly && includeOnlyRoutesRegexp) {
        if (!includeOnlyRoutesRegexp.test(pathname)) {

            if (logFn) {
                logFn('req with url:', pathname, 'was *skipped* by curtain because it was not *included*.');
            }
            //if we have an include only list, and there is no match - the route is already excluded, don't need to check exclude list
            return ({
                curtainErrorMessage: true,
                rateExceeded: false,
                routeExcluded: true
            });
        }
    }

    if (excludeRoutesRegexp && excludeRoutesRegexp.test(pathname)) {
        if (logFn) {
            logFn('req with url:', pathname, 'was *skipped* by curtain because it was in the exclude list.');
        }

        return ({
            rateExceeded: false,
            routeExcluded: true
        });
    }
};