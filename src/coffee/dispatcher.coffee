define (require) ->
  _ = require 'underscore'
  Backbone = require 'backbone'
  _.clone Backbone.Events
