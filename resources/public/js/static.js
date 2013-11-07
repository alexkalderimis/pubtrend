require.config({
  paths: {
    "Q": "../vendor/q/q",
    "text": '../vendor/text',
    "data-source": "./client-side-data-source",
    "abstract-source": "./client-side-abstract-source"
  }
});

require(["./main", "./initargs"], function (main, initargs) {
  main(initargs);
});
