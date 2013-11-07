define(['Q', 'results-cache'], function (Q, resultsCache) {

  var ESEARCH = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    , tool = "pubtrend"
    , email = "alex.kalderimis+pubtrend-client@gmail.com"
    , db = "pubmed";

  var readCount = function (doc) {
    var cElem = doc.getElementsByTagName("Count")[0];
    return parseInt(cElem.textContent, 10);
  };

  var getCounter = function (term) {
    return function (year) {
      var params, def = Q.defer()
        , onSuccess = _.compose(def.resolve.bind(def), readCount);
      
      params = {
        tool: tool,
        email: email,
        db: db,
        rettype: "count",
        mindate: (year + "/01"),
        maxdate: (year + "/12"),
        term: term,
        datetype: "pdat"
      };

      $.ajax({
        type: "GET",
        url: ESEARCH,
        data: params,
        dataType: "xml",
        error: def.reject.bind(def),
        success: onSuccess
      });
      return def.promise;
    };
  };

  var getData = function (opts) {
    var promises
      , getCount = getCounter(opts.term)
      , uncachedYears = resultsCache.getUncachedYears(opts)
      , addToCache = resultsCache.addToCache(opts)
      , serveWithHits = resultsCache.serveWithCacheHits(opts)
      , def = Q.defer();

    if (uncachedYears.length) {
      promises = uncachedYears.map(getCount);
      Q.all(promises).then(function (counts) {
        var i, ret = [];
        for (i = 0; i < counts.length; i++) {
          ret.push([uncachedYears[i], counts[i]]);
        }
        def.resolve(ret);
      }).fail(def.reject.bind(def));
    } else {
      console.log("Full cache hit");
      def.resolve([]);
    }

    return def.promise.then(addToCache).then(serveWithHits);
  };

  return getData;
});

