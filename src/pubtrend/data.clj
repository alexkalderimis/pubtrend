(ns pubtrend.data
  (:use [clojure.tools.logging])
  (:require [http.async.client :as http]
            [clojure.xml :as xml]
            [clojure.zip :as zip])
  (:import [java.io ByteArrayInputStream]))

(def tool "pubtrend")
(def email "alex.kalderimis@gmail.com")
(def esearch-base "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi")
(def db "pubmed")
(def param-base
  {:tool tool
   :email email
   :db db})

(defn zip-str [^String s]
  (zip/xml-zip (xml/parse (ByteArrayInputStream. (.getBytes s)))))

(defn read-count [^String resp-body]
  (-> resp-body zip-str zip/down zip/down first Integer/valueOf))

(def ^:dynamic *client*)

;; returns a promise for a body
(defn- do-req [term year]
  (info "Cache miss for" term "in" year)
  (let [uri esearch-base
        headers {:Accept "application/xml"}
        params (assoc param-base
                      :rettype "count"
                      :mindate (str year "/01")
                      :maxdate (str year "/12")
                      :term term
                      :datetype "pdat")]
      (http/GET *client* uri :query params :headers headers)))

;; Returns a future for an integer.
(defn get-count* [term year]
  (future (-> (do-req term year) http/await http/string read-count)))

(def get-count (memoize get-count*))

(defn get-trend
  [term years]
  (with-open [client (http/create-client :max-conns-per-host (inc (count years)))]
    (binding [*client* client]
      (let [promised-counts (map (partial get-count term) years)]
        (doall (map list years (map deref promised-counts)))))))

