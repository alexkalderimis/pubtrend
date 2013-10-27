define(function () {
  var TrendView = Backbone.View.extend({
  
    initialize: function () {
      this.model.on('change', this.render.bind(this));
    },

    events: {
      "submit": "onSubmit",
      "click #add-term": "addTerm",
    },

    addTerm: function (evt) {
      evt.preventDefault();
      evt.stopImmediatePropagation();
      this.addTermBox();
    },

    addTermBox: function (val, idx) {
      var self = this
        , container = this.$('#pubtrends-terms')
        , terms = self.model.get('terms').slice()
        , row  = $('<div class="row">')
        , tb = $('<input class="pubtrends-term" type="text">')
        , rm = $('<button class="small secondary button">-</button>');
      
      if (idx != null && idx === 0) {
        row.append(tb)
      } else {
        var left = $('<div class="small-8 columns">');
        left.append(tb);
        row.append(left);
        var right = $('<div class="small-4 columns">');
        right.append(rm);
        row.append(right);
        rm.click(function (evt) {
          evt.preventDefault();
          evt.stopImmediatePropagation();
          if (idx == null) {
            row.remove(); // not in model, just UI.
          } else {
            terms.splice(idx, 1); // Remove this term from model
            self.model.set('terms', terms)
          }
        });
      }

      this.$('#pubtrends-terms').append(row);
      if (val != null) tb.val(val);
    },

    removeTerm: function (evt) {
      if (evt) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
      }
      var termBoxes = this.$('.pubtrends-term')
        , lastBox = termBoxes.last()
        , lastVal = lastBox.val()
        , currentTerms = this.model.get('terms');
      if (termBoxes.length > 1 &&
        (lastVal == null || lastVal.trim().length == 0)) {
        // Just get rid of the last empty box - superficial operation.
        lastBox.remove();
      } else if (currentTerms.length > 1) {
        // Actually operate on the model.
        this.model.set('terms', currentTerms.slice(0, currentTerms.length - 1));
      }
      // Always leave at least one term.
    },

    onSubmit: function (evt) {
      evt.preventDefault();
      var terms = this.$('.pubtrends-term').map(function () {
        return $(this).val();
      }).get().filter(function (t) { return t && t.trim().length });
      var newOpts = {
        terms:  terms,
        start: parseInt(this.$('#pubtrends-from').val(), 10),
        end:   parseInt(this.$('#pubtrends-til').val(), 10)
      };
      this.model.set(newOpts);
    },

    render: function () {
      this.$('#pubtrends-terms').empty();
      this.model.get('terms').forEach(this.addTermBox.bind(this));
      this.$('#pubtrends-from').val(this.model.get('start'));
      this.$('#pubtrends-til').val(this.model.get('end'));
      return this.el;
    }
  });

  return TrendView;
});
