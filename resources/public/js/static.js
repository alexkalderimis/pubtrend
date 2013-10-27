require.config({
  paths: {
    "Q": "../vendor/q/q",
    "data-source": "./client-side-data-source"
  }
});

require(["./main", "./initargs"], function (main, initargs) {
  main(initargs);
});
