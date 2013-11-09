define ->

  resultsCache = {}

  getTermCache = (term) -> resultsCache[term] ?= {}

  fromPairs = (pairs) ->
    ret = {}
    ret[k] = v for [k, v] in pairs
    return ret

  getUncachedYears = ({term, start, end}) ->
    cache = getTermCache(term)

    (year for year in [start .. end] when year not of cache)

  serveWithCacheHits = ({term, start, end}) -> (data) ->
    cache = getTermCache term
    dataMap = fromPairs data

    ([year, (dataMap[year] ? cache[year])] for year in [start .. end])

  addToCache = ({term}) -> (data) ->
    cache = getTermCache(term);
    for [year, value] in data
      cache[year] = value

    return data

  resultsCache =
    getUncachedYears: getUncachedYears,
    add: addToCache,
    withHits: serveWithCacheHits
