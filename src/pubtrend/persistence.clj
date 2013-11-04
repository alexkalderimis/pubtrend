(ns pubtrend.persistence
  (require [clojure.java.jdbc :as jdbc]
           [clojure.java.jdbc.ddl :as ddl]))

(def o (Object.))

(def db-file (java.io.File. "locations.db"))

(def dbspec
  (let [abs-path (.getAbsolutePath db-file)]
    (str "jdbc:sqlite:/" abs-path)))

(def get-loc-sql "SELECT lat, lng FROM locations WHERE address = ?")

(defn retry
  ([n f] (retry n f 0))
  ([n f cur]
   (try
     (f)
     (catch Exception e (when (< cur n) (retry n f (inc cur)))))))

(defn get-location [address]
  (retry 3 (fn [] (first (jdbc/query dbspec [get-loc-sql address])))))

(defn save-location [address {lat :lat lng :lng}]
  (locking o (jdbc/insert! dbspec :locations nil [address lat lng])))

(defn init-db []
  (if (.createNewFile db-file)
    (jdbc/db-do-commands
      dbspec
      (ddl/create-table :locations
                        [:address "text"]
                        [:lat "double"]
                        [:lng "double"]))))
