define ['backbone', 'text!/html/journal.html'], (Backbone, html) ->

  class Journal extends Backbone.View

    tagName: 'li'
    className: 'journal'

    template: _.template(html)

    render: ->
      @$el.html @template @model.toJSON()
      return this

  return Journal
