require.config({
  paths: {
    "Q": "/vendor/q/q",
    "data-source": "/js/middle-ware-data-source"
  }
});

require(["./main", "./initargs"], function (main, initargs) {
  main(initargs);
});
