define(function () {
  var CURRENT_YEAR = (new Date()).getUTCFullYear();
  return {
    terms: ["asthma"],
    start: CURRENT_YEAR - 20,
    end: CURRENT_YEAR
  };
});
