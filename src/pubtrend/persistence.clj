(ns pubtrend.persistence
  (require [clojure.java.jdbc     :as jdbc]
           [clojure.java.jdbc.sql :as s]
           [clojure.java.jdbc.ddl :as ddl]))

(def o (Object.))

(def ^:dynamic db-file (java.io.File. "locations.db"))

(defn make-spec [file]
  (let [abs-path (.getAbsolutePath file)]
    (str "jdbc:sqlite:/" abs-path)))

(def ^:dynamic dbspec (make-spec db-file))

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

(defn dump-db []
  (init-db)
  (let [res (jdbc/query dbspec (s/select * :locations))]
    (doseq [{adr :address lat :lat lng :lng} res]
      (println (format "%s\t%f\t%f" adr lat lng)))))

(defn- parse-line [line]
  (let [to-dbl #(if (= "null" %) nil (Double/parseDouble %))
        [adr lat-s lng-s] (clojure.string/split line #"\t")
        lat (to-dbl lat-s)
        lng (to-dbl lng-s)]
    [adr lat lng]))

(defn load-db [rdr]
  (init-db)
  (doseq [lines (partition 100 (line-seq rdr))]
    (let [to-insert (map parse-line lines)]
      (apply jdbc/insert! dbspec :locations nil to-insert))))

