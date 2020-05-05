export interface IEnvironment {
    production: boolean,
    tempSharedStorage: {
      /**
       * Go to https://db.neelr.dev to get your API endpoint,
       * then paste your URL below.
       */
      endpoint: string,
      /**
       * As https://db.neelr.dev doesn't have CORS enabled at
       * time of authoring, you will likely need to use a CORS
       * proxy. Configure yours below. If falsey it won't be used.
       */
      corsProxy?: string,
      /**
       * How often to check for changes on the server
       * when in watch mode
       */
      watchInterval?: number
}
