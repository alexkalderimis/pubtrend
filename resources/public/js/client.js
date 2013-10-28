require.config({
  paths: {
    "Q": "/vendor/q/q",
    "backbone-foundation-reveal": "/vendor/backbone.foundation.reveal.modal/js/modal",
    "data-source": "/js/middle-ware-data-source",
    "abstract-source": "/js/client-side-abstract-source"
  }
});

require(["./main", "./initargs"], function (main, initargs) {
  main(initargs);
});
