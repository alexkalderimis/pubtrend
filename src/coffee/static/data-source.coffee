define ['Q', 'results-cache', 'http', 'underscore'], (Q, resultsCache, http, _) ->

  ESEARCH = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
  tool = "pubtrend"
  email = "alex.kalderimis+pubtrend-client@gmail.com"
  db = "pubmed"

  readCount = (doc) ->
    cElem = doc.getElementsByTagName("Count")[0]
    return parseInt(cElem.textContent, 10)

  getCounter = (term) -> (year) ->

    fetching = http.ajax
      type: "GET",
      url: ESEARCH,
      dataType: "xml",
      data:
        tool: tool,
        email: email,
        db: db,
        rettype: "count",
        mindate: (year + "/01"),
        maxdate: (year + "/12"),
        term: term,
        datetype: "pdat"

    return fetching.then readCount

  getData = (opts) ->
    getCount = getCounter(opts.term)
    uncachedYears = resultsCache.getUncachedYears(opts)
    addToCache = resultsCache.addToCache(opts)
    serveWithHits = resultsCache.serveWithCacheHits(opts)

    fetching = if uncachedYears.length is 0
      console.log("Full cache hit")
      Q []
    else
      console.log "#{ uncachedYears.length } cache misses"
      Q.all(uncachedYears.map getCount).then (counts) -> _.zip uncachedYears, counts

    return fetching.then(addToCache).then(serveWithHits)

  return getData
