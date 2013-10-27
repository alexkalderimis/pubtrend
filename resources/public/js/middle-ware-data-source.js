define(['Q', './results-cache'], function (Q, resultsCache) {

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
      , def = Q.defer();

    if (url) {
      $.ajax({
        type: "GET",
        url: url,
        dataType: "json",
        error: def.reject.bind(def),
        success: def.resolve.bind(def)
      });
    } else {
      console.log("Full cache hit");
      def.resolve([]);
    }

    return def.promise.then(addToCache).then(serveWithHits);
  };

  return getData;
});
