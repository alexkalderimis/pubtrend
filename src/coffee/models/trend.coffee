define ['backbone', 'dispatcher'], (Backbone, dispatcher) ->

  class Trend extends Backbone.Model

    set: (attrs, opts, opts2) ->
      if typeof attrs is 'string'
        [k, v, attrs, opts] = [attrs, opts, {}, opts2]
        attrs[k] = v

      start = attrs.start ? @attributes.start
      end = attrs.end ? @attributes.end

      if start <= end and start >= Trend.MIN and end <= Trend.MAX
        super attrs, opts
      else
        @trigger("reject-values", this, start, end)
        dispatcher.trigger("Trend:rejected-values", this, start, end)

    width: ->
      {start, end} = @attributes

      if start and end
        end + 1 - start
      else
        null

  Trend.MIN = 1900
  Trend.MAX = (new Date()).getUTCFullYear()

  return Trend
