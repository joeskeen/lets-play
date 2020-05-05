// This environment file is used as a template only.
// You will need to create your own environment.dev.user.ts
// and environment.prod.user.ts files to make the app
// function correctly. Implement the IEnvironment interface
// and see documentation in that file for more details.

import { IEnvironment } from './environment.interface';

export const environment: IEnvironment = {
  production: false,
  // corsProxy: 'https://cors-anywhere.herokuapp.com/',
  tempSharedStorage: {
    endpoint: 'https://db.neelr.dev/api/5a5f801ef552f04c511b6abd21756b32',
    watchInterval: 10 * 1000,
  },
  nameServer: 'https://frightanic.com/goodies_content/docker-names.php'
};
