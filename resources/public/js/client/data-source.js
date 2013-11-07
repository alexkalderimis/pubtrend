define(['Q', 'results-cache', 'http'], function (Q, resultsCache, http) {

  var trendUrlTempl = _.template("/disease/<%= term %>/<%= years %>");

  var getTrendUrl = function (opts) {
    var i, years
      , term = opts.term
      , uncachedYears = resultsCache.getUncachedYears(opts)
      , nCacheMisses = uncachedYears.length;

    if (nCacheMisses == 0) return null;

    if (nCacheMisses = (uncachedYears[nCacheMisses - 1] - uncachedYears[0] + 1)) {
      // Continuous range.
      years = [uncachedYears[0], uncachedYears[nCacheMisses - 1]].join('/');
    } else {
      // Discontinuous range.
      years = uncachedYears.join('-');
    }
    console.log(nCacheMisses + " local cache misses");
    return trendUrlTempl({term: term, years: years });
  };

  var getData = function (opts) {
    var url = getTrendUrl(opts)
      , addToCache = resultsCache.addToCache(opts)
      , serveWithHits = resultsCache.serveWithCacheHits(opts)
      , promise = (url) ? http.getJSON(url) : Q([]);

    return promise.then(addToCache).then(serveWithHits);
  };

  return getData;
});
