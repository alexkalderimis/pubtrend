define ['Q', 'results-cache', 'http'],  (Q, cache, http) ->

  trendUrlTempl = ({term, years}) -> "/disease/#{ term }/#{ years }"

  getTrendUrl = (opts) ->
    term = opts.term
    uncachedYears = cache.getUncachedYears(opts)
    nCacheMisses = uncachedYears.length

    return null if nCacheMisses is 0

    years = if nCacheMisses is uncachedYears[nCacheMisses - 1] - uncachedYears[0] + 1
      #  Continuous range.
      [start, end] = [uncachedYears[0], uncachedYears[nCacheMisses - 1]]
      "#{ start }/#{ end }"
    else
      # Discontinuous range.
      uncachedYears.join('-')

    console.log(nCacheMisses + " local cache misses")

    trendUrlTempl {term, years}

  getData = (opts) ->
    [url, addToCache, serveWithHits] = (f opts for f in [getTrendUrl, cache.add, cache.withHits])
    promise = if (url) then http.getJSON(url) else Q []

    promise.then(addToCache).then(serveWithHits)
