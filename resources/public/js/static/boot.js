require.config({
  paths: {
    "Q": "../vendor/q/q",
    "text": '../vendor/text',
    "data-source": "static/data-source",
    "abstract-source": "static/abstract-source"
  }
});

require(["main", "initargs"], function (main, initargs) {
  main(initargs);
});
