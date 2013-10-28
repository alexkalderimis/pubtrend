require.config({
  paths: {
    "Q": "../vendor/q/q",
    "backbone-foundation-reveal": "../vendor/backbone.foundation.reveal.modal/js/modal",
    "data-source": "./client-side-data-source",
    "abstract-source": "./client-side-abstract-source"
  }
});

require(["./main", "./initargs"], function (main, initargs) {
  main(initargs);
});
