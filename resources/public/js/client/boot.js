require.config({
  baseUrl: '/js',
  paths: {
    "Q": "/vendor/q/q",
    "text": '/vendor/text',
    "data-source": "client/data-source",
    "abstract-source": "static/abstract-source"
  }
});

require(['main', 'initargs'], function (main, args) {
  main(args);
});
