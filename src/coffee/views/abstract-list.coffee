define (require) ->

  Backbone = require 'backbone'
  _ = require 'underscore'
  Journal = require 'views/journal'

  class AbstractList extends Backbone.View

    addAbstract: (journal) =>
      journalView = new Journal model: journal
      @$('ul').append journalView.render().el

    render: ->
      ul = document.createElement('ul')
      @$el.html(ul)
      @collection.each @addAbstract
      @collection.on 'add', @addAbstract
