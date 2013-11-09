define ['Q', 'underscore'], (Q, _) ->

  EFETCH = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'
  ESEARCH = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
  tool = "pubtrend"
  email = "alex.kalderimis+pubtrend-client@gmail.com"
  db = 'pubmed'
  retmode = 'xml'

  ## :: (Node, String) -> String? **/
  tagProp = (elem, tag) ->
    return null unless elem?
    child = elem.getElementsByTagName(tag)[0]
    child?.textContent

  parseAuthor = (elem) ->
    ret = {}
    ret.foreName = tagProp(elem, 'ForeName')
    ret.lastName = tagProp(elem, 'LastName')
    return ret

  ###
  * :: (Element) -> Object
  ###
  parseCitation = (art) ->
    ret = {journal: {}}
    journalInfo    = art.getElementsByTagName('Journal')[0]
    journalIssue   = art.getElementsByTagName('JournalIssue')[0]
    dateInfo       = art.getElementsByTagName('PubDate')[0]
    abstractInfo   = art.getElementsByTagName('Abstract')[0]
    authors        = art.getElementsByTagName('Author')

    ret.title          = tagProp(art, 'ArticleTitle')
    ret.affiliation    = tagProp(art, 'Affiliation')
    ret.year           = tagProp(dateInfo, 'Year')
    ret.month          = tagProp(dateInfo, 'Month')
    ret.abstract       = tagProp(abstractInfo, 'AbstractText')
    ret.copyright      = tagProp(abstractInfo, 'CopyrightInformation')
    ret.authors        = [].map.call(authors, parseAuthor)
    ret.journal.title  = tagProp(journalInfo, 'Title')
    ret.journal.issue  = tagProp(journalIssue, 'Issue')
    ret.journal.volume = tagProp(journalIssue, 'Volume')

    return ret

  ###
   * Process a pubmed medline citation result set and produce article
   * data objects.
   * :: (Document) -> Array<Journal>
  ###
  extractAbstracts = (term) -> (doc) ->
    (_.extend parseCitation(e), {term} for e in doc.getElementsByTagName('Article'))

  ###
   * Read out the ids as strings :: (Document) -> Array<String>
  ###
  extractIds = (doc) ->
    # They are integers, but we can treat them as strings.
    (elem.textContent for elem in doc.getElementsByTagName('Id'))

  ## (string, int, int?, int?) -> Promise<Array<String>>
  getIds = (term, year, offset, limit) ->
    def = Q.defer()
    onSuccess = _.compose(def.resolve.bind(def), extractIds)

    params =
        tool: tool,
        email: email,
        db: db,
        term: term,
        rettype: "uilist",
        mindate: (year + "/01"),
        maxdate: (year + "/12"),
        term: term,
        datetype: "pdat",
        retmax: (limit ? 100)

    params.retstart = offset if offset?

    $.ajax
      type: "GET",
      url: ESEARCH,
      data: params,
      dataType: "xml",
      error: def.reject.bind(def),
      success: onSuccess

    return def.promise

  ## (string, int, int?, int?) -> Promise<Array<Journal>>
  getAbstracts = (term, year, offset, limit) ->
    def = Q.defer()
    onSuccess = _.compose(def.resolve.bind(def), extractAbstracts(term))
    gettingIds = getIds(term, year, offset, limit)

    gettingIds.then (ids) ->
      params =
        tool: tool,
        email: email,
        db: db,
        retmode: retmode,
        id: ids.join(',')

      $.ajax
        type: "POST",
        url: EFETCH,
        data: params,
        dataType: "xml",
        error: def.reject.bind(def),
        success: onSuccess

    return def.promise

  return getAbstracts
