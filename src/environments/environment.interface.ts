export interface IEnvironment {
  production: boolean;
  
  /**
   * As some service dependencies doesn't have CORS enabled at
   * time of authoring, you will likely need to use a CORS
   * proxy. Configure yours below. If falsey it won't be used.
   */
  corsProxy?: string;

  tempSharedStorage: {
    /**
     * Go to https://db.neelr.dev to get your API endpoint,
     * then paste your URL below.
     */
    endpoint: string;
    /**
     * How often to check for changes on the server
     * when in watch mode
     */
    watchInterval?: number;
  };

  /** endpoint to GET random names from */
  nameServer: string;
}
