(ns pubtrend.tasks
  (:require [clojure.java.io :as io]
            [pubtrend.persistence :as p]))

(declare dump-locations load-locations)

(defn locations [&[action filename]]
  "
  Dump/Load the location information.
    action: {dump, load} What to do.
    file: The filename to dump to, or load from.
  "
  (if-not (and action filename)
    (println "Both action and filename are required")
    (let [file (io/file filename)]
      (case action
        "load" (load-locations file)
        "dump" (dump-locations file)
        (println "action must be 'dump' or 'load', not" action)))))

(defn load-locations [file]
  (with-open [rdr (io/reader file)]
    (p/load-db rdr)))

(defn dump-locations [file]
  (with-open [wtr (io/writer file)]
    (binding [*out* wtr] (p/dump-db))))
