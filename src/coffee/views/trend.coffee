define ['backbone'], (Backbone) ->

  class TrendView extends Backbone.View
  
    initialize: ->
      @model.on 'change', @render
      @model.on 'reject-values', @render
      @model.on 'reject-values', @noteError

    events: ->
      'submit': 'onSubmit',
      'click #add-term': 'addTerm'

    addTerm: (evt) ->
      evt.preventDefault()
      evt.stopImmediatePropagation()
      @addTermBox()

    addTermBox: (val, idx, all) =>
      container = @$('#pubtrends-terms')
      terms = @model.get('terms').slice() # slice to get fresh ref.
      row  = $('<div class="row">')
      tb = $('<input class="pubtrends-term" type="text">')
      rm = $('<button class="small secondary button">-</button>')
      
      if (all and all.length is 1) # iterating over more than one
        row.append(tb)
      else
        left = $('<div class="small-8 columns">')
        left.append(tb)
        row.append(left)
        right = $('<div class="small-4 columns">')
        right.append(rm)
        row.append(right)
        rm.click (evt) =>
          evt.preventDefault()
          evt.stopImmediatePropagation()
          if idx is null
            row.remove() # not in model, just UI.
          else
            terms.splice(idx, 1); # Remove this term from model
            @model.set {terms}

      @$('#pubtrends-terms').append row
      tb.val(val) if val?

    readTerms: -> @$('.pubtrends-term')
      .map(-> $(@).val() )
      .get()
      .filter (t) -> t && t.trim().length

    onSubmit: (evt) ->
      evt.preventDefault()
      newOpts =
        terms: @readTerms(),
        start: parseInt(@$('#pubtrends-from').val(), 10),
        end:   parseInt(@$('#pubtrends-til').val(), 10)

      @model.set(newOpts)

    render: =>
      @$('#pubtrends-terms').empty()
      @model.get('terms').forEach @addTermBox
      @$('#pubtrends-from').val @model.get 'start'
      @$('#pubtrends-til').val @model.get 'end'
      @el

    noteError: =>
      inputs = @$('input').addClass 'error'
      setTimeout(inputs.removeClass.bind(inputs, 'error'), 2500)

  return TrendView
