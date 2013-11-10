define (require) ->

  MapView = require 'views/distribution-map'
  PieChart = require 'views/journal-pie-chart'
  AbstractList = require 'views/abstract-list'
  getAbstracts = require 'abstract-source'
  http = require 'http'
  html = require 'text!/html/journal-list.html'

  class JournalList extends Backbone.View

    className: 'modal reveal-modal journal-list'

    initialize: ->
      @subviews = []
      @collection = new Backbone.Collection unless @collection?

      @initialWidth = @model.get('limit')
      @upTo = @model.get('offset')

      @model.set({view: 'map'}) unless @model.has('view')
      @model.on 'change:offset', @getData
      @model.on 'change:limit', (model, limit) =>
        offset = @upTo
        @fetchInParallel(offset, limit)
      @collection.on 'add', => @$('.summary .sample-size').text @collection.length

    getData: =>
      {offset, limit} = @model.toJSON()
      @collection.reset()
      @fetchInParallel(offset, offset + limit)

    fetchInParallel: (from, to) ->
      {terms, year} = @model.toJSON()
      addCitation = (xs) => @collection.add xs
      @upTo = to
      for idx in [from ... to]
        for term in terms
          getAbstracts(term, year, idx, 1).then addCitation

    events: ->
      'opened': ->
        @$el.foundation('section', 'reflow')
        view = @model.get 'view'
        @showAbstractList()
        @showPieChart()
        @showMap()
        _.defer => @$("""a[href="\##{view}-panel"]""").click()
          
      'click .title.map': -> @model.set view: 'map'
      'click .title.abstracts': -> @model.set view: 'abstracts'
      'click .title.journals': -> @model.set view: 'journals'
      'click .close': (evt) ->
        evt.preventDefault()
        evt.stopPropagation()
        @close()
      'change input[name="view"]': (evt) ->
        evt.preventDefault()
        evt.stopPropagation()
        @model.set 'view', $(evt.target).val()
      'click .get-more': (evt) ->
        evt.preventDefault()
        evt.stopPropagation()
        {offset, limit, view} = @model.attributes
        if view isnt 'abstracts'
          @model.set('limit', limit + @initialWidth)
        else
          @model.set('offset', offset + limit)

    template: _.template(html)

    show: ->
      @render()
      $('body').append @el
      @$el.foundation('reveal', 'open')
      @getData()
      return @

    close: ->
      @$el.foundation('reveal', 'close')
      @remove()

    evictKids: ->
      while sv = @subviews.pop()
        sv.remove()

    remove: ->
      @collection.off()
      @model.off()
      @evictKids()
      super

    showSubView: (Clazz, selector) ->
      view = new Clazz {@collection, @model}
      @$(selector).html view.el
      view.render()
      @subviews.push view

    showAbstractList: -> @showSubView AbstractList, '.abstracts-panel'

    showPieChart: -> @showSubView PieChart, '.journals-panel'

    showMap: -> @showSubView MapView, '.map-panel'

    render: =>
      @$el.html @template @model.toJSON()
      return this

  return JournalList
