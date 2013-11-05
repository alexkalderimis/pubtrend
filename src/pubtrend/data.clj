(ns pubtrend.data
  (:use [clojure.tools.logging])
  (:require [http.async.client :as http]
            [clojure.xml :as xml]
            [cheshire.core :as json]
            [clojure.string :refer [join]]
            [clojure.zip :as zip]
            [pubtrend.persistence :as persist])
  (:import [java.io ByteArrayInputStream]))

(def tool "pubtrend")
(def email "alex.kalderimis@gmail.com")
(def esearch-base "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi")
(def geocode "http://maps.googleapis.com/maps/api/geocode/json")
(def db "pubmed")
(def headers {:Accept "application/xml" :User-Agent "pubtrend/0.1.0"})
(def param-base
  {:tool tool
   :email email
   :db db})

(defn zip-str [^String s]
  (zip/xml-zip (xml/parse (ByteArrayInputStream. (.getBytes s)))))

(defn read-count [^String resp-body]
  (-> resp-body zip-str zip/down zip/down first Integer/valueOf))

(defn read-ids [^String resp-body]
  (->> resp-body
       zip-str
       zip/children
       (filter (comp #(= :IdList %) :tag))
       (mapcat :content)
       (mapcat :content)
       (map #(Integer/valueOf %))))

(def ^:dynamic *client*)

;; returns a promise for a body
(defn- do-req [term year fmt & {:as opts}]
  (info fmt "cache miss for" term "in" year)
  (let [uri esearch-base
        headers {:Accept "application/xml"}
        params (assoc param-base
                      :rettype fmt
                      :mindate (str year "/01")
                      :maxdate (str year "/12")
                      :term term
                      :datetype "pdat")]
      (http/GET *client* uri :query (into params opts) :headers headers)))

;; Returns a future for an integer.
(defn get-count* [term year]
  (future (-> (do-req term year "count")
              http/await
              http/string
              read-count)))

;; Specialized memoise - don't cache on error.
(def counts (atom {}))
(defn get-count [& args]
  (future 
    (if-let [e (find @counts args)]
            (val e)
            (let [ret @(apply get-count* args)]
              (swap! counts assoc args ret)
                ret))))

(defn get-trend
  [term years]
  (with-open [client (http/create-client :max-conns-per-host (inc (count years)))]
    (binding [*client* client]
      (let [promised-counts (map (partial get-count term) years)]
        (doall (map list years (map deref promised-counts)))))))

(defn get-ids* [term year]
  (with-open [c (http/create-client)]
    (binding [*client* c]
      (-> (do-req term year "xml" :retmax 500)
          http/await
          http/string
          read-ids))))

(def get-ids (memoize get-ids*)) ;; use dereffing memoize

(def efetch "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi")

(defn get-pubs [ids]
  (with-open [c (http/create-client)]
    (let [params (assoc param-base
                        :id (join "," ids)
                        :retmax 500
                        :retmode "xml")]
      (-> (http/POST c efetch :query params :headers headers)
          http/await
          http/string))))

(defn tag-at [src tag]
  (first (filter #(= tag (:tag %)) (:content src))))

(defn text-at [src tag]
  (-> (tag-at src tag) :content first))

(defn get-content-in [doc path]
  (let [entry (first (zip/children doc))
        end (reduce tag-at entry path)]
    (:content end)))

(defn get-text-in [doc path]
  (first (get-content-in doc path)))

(defn read-author [auth]
  (let [last-name (text-at auth :LastName)
        fore-name (text-at auth :ForeName)]
    {:last-name last-name :fore-name fore-name}))

(defn get-authors [mlc]
  (let [author-list (get-content-in mlc [:Article :AuthorList])]
    (vec (map read-author author-list))))

(defn parse-citation [mlc]
  (let [title (get-text-in mlc [:Article :ArticleTitle])
        year (get-text-in mlc [:Article :Journal :JournalIssue :PubDate :Year])
        month (get-text-in mlc [:Article :Journal :JournalIssue :PubDate :Month])
        journal (get-text-in mlc [:Article :Journal :Title])
        pmid (get-text-in mlc [:PMID])
        authors (get-authors mlc)
        abstract (get-text-in mlc [:Article :Abstract :AbstractText])
        affiliation (get-text-in mlc [:Article :Affiliation])]
    {:title title :year year :month month
     :abstract abstract :pmid pmid :authors authors
     :journal journal :affiliation affiliation}))

(defn parse-citations [entry]
  (cons (parse-citation entry)
        (lazy-seq
          (when-let [nxt (zip/right entry)]
            (parse-citations nxt)))))

(defn strip-email-addresses [s]
  (.replaceAll s "\\S+@\\S+" ""))

(defn normalize-spaces [s]
  (.replaceAll s "\\s\\s+" " "))

(defn normalize-affil [affil]
  (when affil
    (-> affil
        strip-email-addresses
        normalize-spaces
        (.trim))))

(defn get-location* [address]
  (future 
    (with-open [c (http/create-client)]
      (let [params {:address address :sensor false}
            headers (assoc headers :Accept "application/json")]
        (-> (http/GET c geocode :query params :headers headers)
            http/await
            http/string
            (json/parse-string keyword)
            :results
            first
            (get-in [:geometry :location]))))))

(def db-connected (atom false))
(def nil-location {})

;; Returns a future for a location.
;; Google is strict about geocoding limit, so try to get this
;; from a local persisted cache where possible.
(defn get-location [address]
  (future
    (if-not address
      nil-location
      (let [normed (normalize-affil address)]
        (when-not @db-connected (do (persist/init-db)
                                    (swap! db-connected (constantly true))))
        (if-let [loc (persist/get-location normed)]
          loc
          (let [fetched (or @(get-location* normed) nil-location)]
            (persist/save-location normed fetched)
            fetched))))))

;; Returns a list of futures of citations
(defn add-locs [citations]
  (let [get-loc (comp get-location normalize-affil :affiliation)
        map-fn (fn [cit] (future (assoc cit :location @(get-loc cit))))]
    (map map-fn citations)))

(defn get-citations
  [term year]
  (let [ids (get-ids term year)
        pubxml (get-pubs ids)
        pubentry (zip/down (zip-str pubxml))]
    (doall (parse-citations pubentry))))
