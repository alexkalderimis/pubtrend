define(['Q'], function (Q) {

  var resultsCache = {};
  var trendUrlTempl = _.template("/disease/<%= term %>/<%= years %>");
  var getTermCache = function (term) {
    return resultsCache[term] || (resultsCache[term] = {});
  };
  var fromPairs = function (pairs) {
    var idx, ret = {};
    for (idx in pairs) {
      ret[pairs[idx][0]] = pairs[idx][1];
    }
    return ret;
  };

  var getTrendUrl = function (opts) {
    var i
      , term = opts.term
      , cache = getTermCache(term)
      , uncachedYears = []
      , years
      , nCacheMisses = 0;

    for (i = opts.start; i <= opts.end; i++) {
      if (cache[i] == null) {
        uncachedYears.push(i);
        nCacheMisses++;
      }
    }
    if (uncachedYears.length == 0) return null;

    if (nCacheMisses = (uncachedYears[nCacheMisses - 1] - uncachedYears[0] + 1)) {
      // Continuous range.
      years = [uncachedYears[0], uncachedYears[nCacheMisses - 1]].join('/');
    } else {
      // Discontinuous range.
      years = uncachedYears.join('-');
    }
    console.log(nCacheMisses + " cache misses");
    return trendUrlTempl({term: term, years: years });
  };

  var addToCache = function (opts) {
    return function (data) {
      var i
        , term = opts.term
        , len = data.length
        , cache = getTermCache(term);

      for (i = 0; i < len; i++) {
        cache[data[i][0]] = data[i][1];
      }
      return data;
    };
  };

  var serveWithCacheHits = function (opts) {
    return function (data) {
      var i, datum
        , cache = getTermCache(opts.term)
        , len = data.length
        , dataMap = fromPairs(data)
        , ret = [];

      for (i = opts.start; i <= opts.end; i++) {
        datum = [i, (cache[i] || dataMap[i])];
        ret.push(datum);
      }
      return ret;
    };
  };

  var getData = function (opts) {
    var url, def;
    url = getTrendUrl(opts);
    def = Q.defer();
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

    return def.promise.then(addToCache(opts)).then(serveWithCacheHits(opts));
  };

  return getData;
});
