define(['Q'], function(Q) {
  var EFETCH = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'
    , ESEARCH = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    , tool = "pubtrend"
    , email = "alex.kalderimis+pubtrend-client@gmail.com"
    , db = 'pubmed'
    , retmode = 'xml';

  /** :: (Node, String) -> String? **/
  var tagProp = function (elem, tag) {
    if (!elem) return null;
    var child = elem.getElementsByTagName(tag)[0];
    return child ? child.textContent : null;
  };

  var parseAuthor = function (elem) {
    var ret = {};
    ret.foreName = tagProp(elem, 'ForeName');
    ret.lastName = tagProp(elem, 'LastName');
    return ret;
  };

  var parseCitation = function (art) {
    var ret = {journal: {}}
      , journalInfo    = art.getElementsByTagName('Journal')[0]
      , journalIssue   = art.getElementsByTagName('JournalIssue')[0]
      , dateInfo       = art.getElementsByTagName('PubDate')[0]
      , abstractInfo   = art.getElementsByTagName('Abstract')[0]
      , authors        = art.getElementsByTagName('Author');

    ret.title          = tagProp(art, 'ArticleTitle');
    ret.affiliation    = tagProp(art, 'Affiliation');
    ret.year           = tagProp(dateInfo, 'Year');
    ret.month          = tagProp(dateInfo, 'Month');
    ret.abstract       = tagProp(abstractInfo, 'AbstractText');
    ret.copyright      = tagProp(abstractInfo, 'CopyrightInformation');
    ret.authors        = [].map.call(authors, parseAuthor);
    ret.journal.title  = tagProp(journalInfo, 'Title');
    ret.journal.issue  = tagProp(journalIssue, 'Issue');
    ret.journal.volume = tagProp(journalIssue, 'Volume');

    return ret;
  };

  /**
   * Process a pubmed medline citation result set and produce article
   * data objects.
   * :: (Document) -> Array<Journal>
   */
  var extractAbstracts = function (term) { return function (doc) {
    var addTerm = function (x) { x.term = term; return x; }
      , f = _.compose(addTerm, parseCitation);
    return _.map(doc.getElementsByTagName('Article'), f);
  }};

  /**
   * Read out the ids as strings :: (Document) -> Array<String>
   */
  var extractIds = function (doc) {
    var idList = [].slice.call(doc.getElementsByTagName('Id'));
    return idList.map(function (elem) {
      // They are integers, but we can treat them as strings.
      return elem.textContent; 
    });
  };

  /** (string, int, int?, int?) -> Promise<Array<String>> **/
  var getIds = function(term, year, offset, limit) {
    var params
      , def = Q.defer()
      , onSuccess = _.compose(def.resolve.bind(def), extractIds);

    params = {
        tool: tool,
        email: email,
        db: db,
        term: term,
        rettype: "uilist",
        mindate: (year + "/01"),
        maxdate: (year + "/12"),
        term: term,
        datetype: "pdat",
        retmax: (limit || 100)
    };
    if (offset) params.retstart = offset;
    $.ajax({
      type: "GET",
      url: ESEARCH,
      data: params,
      dataType: "xml",
      error: def.reject.bind(def),
      success: onSuccess
    });
    return def.promise;
  };

  /** (string, int, int?, int?) -> Promise<Array<Journal>> **/
  var getAbstracts = function (term, year, offset, limit) {
    var params
      , def = Q.defer()
      , onSuccess = _.compose(def.resolve.bind(def), extractAbstracts(term))
      , gettingIds = getIds(term, year, offset, limit);

    gettingIds.then(function (ids) {
      var params = {
        tool: tool,
        email: email,
        db: db,
        retmode: retmode,
        id: ids.join(',')
      };
      $.ajax({
        type: "POST",
        url: EFETCH,
        data: params,
        dataType: "xml",
        error: def.reject.bind(def),
        success: onSuccess
      });
    });

    return def.promise;
  };

  return getAbstracts;
});
