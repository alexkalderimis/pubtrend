(ns pubtrend.handler
  (:use compojure.core
        clojure.tools.logging
        [clojure.string :only (split)])
  (:require [pubtrend.data :as data]
            [pubtrend.assets :as assets]
            [pubtrend.views :as views]
            [compojure.handler :as handler]
            [cheshire.core :as json]
            [compojure.route :as route]))

(def api-headers
  {"Content-Type" "application/json"
   "cache-control" "public"})

(def to-json json/generate-string)

(defn serve [data]
    {:status 200
     :headers api-headers
     :body (to-json data)})

(defn disease-trend
  ([term start end]
    (let [years (range (Integer/valueOf start) (inc (Integer/valueOf end)))]
      (disease-trend term years)))
  ([term years]
   (-> term (data/get-trend years) serve)))

(defn citation-records [term year]
  (-> (data/get-citations term year) serve))

(def one-year #"\d{4}")
(def multi-year #"(\d{4}-)*\d{4}")

(defroutes api-routes
  (GET ["/disease/:term/:start/:end" :start one-year :end one-year]
       [term start end]
         (disease-trend term start end))
  (GET ["/disease/:term/:year" :year one-year]
       [term year]
         (disease-trend term [year]))
  (GET ["/disease/:term/:years" :years multi-year]
       [term years]
       (let [years (split years #"-")]
         (disease-trend term years)))
  (GET ["/citations/:term/:year" :year one-year]
       [term year]
         (citation-records term year))
  (GET "/location" {params :query-params}
       (-> "address" params data/get-location deref serve)))

(defroutes site-routes
  (GET "/" [] (views/index))
  (route/resources "/")
  (route/not-found "Not Found"))

(def site (routes
  (handler/api api-routes)
  (handler/site site-routes)))

(def app 
  (-> site 
      (assets/asset-pipeline :output-dir "/js" :engine :v8 :coffee-route "src/coffee")))
