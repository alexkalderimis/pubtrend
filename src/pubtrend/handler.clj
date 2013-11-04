(ns pubtrend.handler
  (:use compojure.core
        [clojure.string :only (split)])
  (:require [pubtrend.data :as data]
            [pubtrend.views :as views]
            [compojure.handler :as handler]
            [cheshire.core :as json]
            [compojure.route :as route]))

(def api-headers
  {"Content-Type" "application/json"
   "cache-control" "public"})

(def to-json json/generate-string)

(defn disease-trend
  ([term start end]
    (let [years (range (Integer/valueOf start) (inc (Integer/valueOf end)))]
      (disease-trend term years)))
  ([term years]
   (let [trend (data/get-trend term years)]
    {:status 200
     :headers api-headers
     :body (json/generate-string trend)})))

(defn citation-records [term year]
  (let [cits (data/citations-with-locations term year)]
    {:status 200
     :headers api-headers
     :body (json/generate-string cits)}))

(def one-year #"\d{4}")
(def multi-year #"(\d{4}-)*\d{4}")

(defroutes app-routes
  (GET "/" [] (views/index))
  (GET ["/disease/:term/:start/:end" :start one-year :end one-year]
       [term start end]
       (disease-trend term start end))
  (GET ["/disease/:term/:years" :years multi-year]
       [term years]
       (let [years (split years #"-")]
         (disease-trend term years)))
  (GET ["/citations/:term/:year" :year one-year]
       [term year]
         (citation-records term year))
  (route/resources "/")
  (route/not-found "Not Found"))

(def app
  (handler/site app-routes))
