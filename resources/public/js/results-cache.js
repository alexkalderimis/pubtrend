define(function () {
  var resultsCache = {};
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
  var getUncachedYears = function (opts) {
    var i
      , term = opts.term
      , cache = getTermCache(term)
      , uncachedYears = []

    for (i = opts.start; i <= opts.end; i++) {
      if (cache[i] == null) {
        uncachedYears.push(i);
      }
    }
    return uncachedYears;
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

  return {
    getUncachedYears: getUncachedYears,
    addToCache: addToCache,
    serveWithCacheHits: serveWithCacheHits
  };
});
