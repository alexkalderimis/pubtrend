define(function () {
  var TrendView = Backbone.View.extend({
  
    initialize: function () {
      this.model.on('change', this.render.bind(this));
      this.model.on('reject-values', this.render.bind(this));
      this.model.on('reject-values', this.noteError.bind(this));
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

    addTermBox: function (val, idx, all) {
      var self = this
        , container = this.$('#pubtrends-terms')
        , terms = self.model.get('terms').slice() // slice to get fresh ref.
        , row  = $('<div class="row">')
        , tb = $('<input class="pubtrends-term" type="text">')
        , rm = $('<button class="small secondary button">-</button>');
      
      if (all != null && all.length == 1) {
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
            self.model.set({terms: terms});
          }
        });
      }

      this.$('#pubtrends-terms').append(row);
      if (val != null) tb.val(val);
    },

    readTerms: function () {
      var terms = this.$('.pubtrends-term')
        .map(function () { return $(this).val(); })
        .get()
        .filter(function (t) { return t && t.trim().length });
      return terms;
    },

    onSubmit: function (evt) {
      evt.preventDefault();
      var newOpts = {
        terms:  this.readTerms(),
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
    },

    noteError: function () {
      var inputs = this.$('input');
      inputs.addClass('error');
      setTimeout(inputs.removeClass.bind(inputs, 'error'), 2500);
    }
  });

  return TrendView;
});
