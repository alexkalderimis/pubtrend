define (require) ->
  Backbone = require 'backbone'
  html = require 'text!/html/journal.html'
  _ = require 'underscore'

  class Journal extends Backbone.View

    tagName: 'li'
    className: 'journal'

    template: _.template(html)

    render: ->
      @$el.html @template @model.toJSON()
      return this

  return Journal
