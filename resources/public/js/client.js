require.config({
  paths: {
    "Q": "/vendor/q/q",
    "text": '/vendor/text',
    "data-source": "/js/middle-ware-data-source",
    "abstract-source": "/js/client-side-abstract-source"
  }
});

require(["./main", "./initargs"], function (main, initargs) {
  main(initargs);
});
