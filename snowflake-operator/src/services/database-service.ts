import * as sqlite3 from "sqlite3";
import log4js from "log4js";
import {LOG4JS_CONFIG} from "../constants/log4js-config"

type Database = sqlite3.Database;

log4js.configure(LOG4JS_CONFIG);
const logger = log4js.getLogger("Database Service");

export class DatabaseService {
  /**
   * Defined path for SQLite3 in-memory database
   */
  private static MEMORY_DB_PATH: string = ":memory:";
  public database: Database;
  public path: string;

  /**
   * Create a singleton instance of DatabaseService
   * @param _path Path to the database file, if not provided, a in-memory database will be created
   * @returns DatabaseService instance
   */
  static instance(_path?: string): DatabaseService {
    let db = this.connectToDatabase(_path);
    return new DatabaseService(db, _path || this.MEMORY_DB_PATH);
  }

  /**
   * Constructor for DatabaseService
   * @param _database Database instance
   * @param _path Path to the database file
   */
  constructor(readonly _database: Database, readonly _path: string) {
    this.database = _database;
    this.path = _path;
  }

  /**
   * Connect to the database
   * @param _path Path to the database file
   * @returns Database instance
   */
  static connectToDatabase(_path?: string): Database {
    let db = new sqlite3.Database(_path || this.MEMORY_DB_PATH, (err) => {
      if (err) {
        logger.error(err.message);
      }
      logger.log("Connected to the database.");
    });
    return db;
  }

  /**
   * Close the database connection
   */
  closeDatabase(): void {
    this.database.close((err) => {
      if (err) {
        logger.error(err.message);
      }
      logger.log("Closed the database connection.");
    });
  }
}
