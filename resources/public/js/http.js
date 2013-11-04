define(['Q'], function (Q) {

  function ajax (opts) {
    var def = Q.defer();
    opts.error = def.reject.bind(def);
    opts.success = def.resolve.bind(def);
    $.ajax(opts);
    return def.promise;
  }

  function getJSON (uri, params) {
    var opts = {
      type: "GET",
      url: uri,
      dataType: "json"
    };
    if (params != null) opts.data = params;
    return ajax(opts);
  }

  return {
    ajax: ajax,
    getJSON: getJSON
  };
});
