(ns pubtrend.persistence
  (require [clojure.java.jdbc :as jdbc]
           [clojure.java.jdbc.ddl :as ddl]))

(def db-file (java.io.File. "locations.db"))

(def dbspec
  (let [abs-path (.getAbsolutePath db-file)]
    (str "jdbc:sqlite:/" abs-path)))

(def get-loc-sql "SELECT lat, lng FROM locations WHERE address = ?")

(defn get-location [address]
  (first (jdbc/query dbspec [get-loc-sql address])))

(defn save-location [address {lat :lat lng :lng}]
  (jdbc/insert! dbspec :locations nil [address lat lng]))

(defn init-db []
  (if (.createNewFile db-file)
    (jdbc/db-do-commands
      dbspec
      (ddl/create-table :locations
                        [:address "text"]
                        [:lat "double"]
                        [:lng "double"]))))
