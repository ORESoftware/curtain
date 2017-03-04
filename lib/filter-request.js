'use strict';


module.exports = function filterIncludeExclude(optz, pathname) {

    const {isIncludeOnly, includeOnlyRoutesRegexp, logFn, excludeRoutesRegexp} = optz;

    if (isIncludeOnly && includeOnlyRoutesRegexp) {
        if (!includeOnlyRoutesRegexp.test(pathname)) {

            logFn('=> Incoming request with with url:', pathname, 'was * skipped / ignored * ' +
                'by Curtain library because it was not *included*.');

            //if we have an include only list, and there is no match - the route is already excluded, don't need to check exclude list
            return {
                curtainError: true,
                curtainErrorMessage: true,
                rateExceeded: false,
                routeExcluded: true
            };
        }
    }

    if (excludeRoutesRegexp && excludeRoutesRegexp.test(pathname)) {
        logFn(' => Incoming request with url:', pathname, 'was * skipped / ignored * ' +
            'by Curtain library because it was in the exclude list.');

        return {
            curtainError: false,
            rateExceeded: false,
            routeExcluded: true
        };
    }
};