define ['Q'], (Q) ->

  ajax = (opts) ->
    def = Q.defer()
    error = def.reject
    success = def.resolve
    $.ajax _.extend {}, opts, {error, success}
    def.promise

  getJSON = (uri, data) -> ajax _.extend (if data? then {data} else {}),
    type: "GET",
    url: uri,
    dataType: "json"

  http =
    ajax: ajax,
    getJSON: getJSON
