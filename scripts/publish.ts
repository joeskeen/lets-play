import * as childProcess from 'child_process';
import { join } from 'path';
import * as project from '../angular.json';
import * as chalk from 'chalk';

console.log(
  chalk.green(
    `Publishing project '${project.defaultProject}' to GitHub Pages...`
  )
);
const remoteInfo = runCommand('git remote -v').toString();
const originUrl = /^origin\s+([^\s]+)\s/.exec(remoteInfo)[1];
const gitHubProjectName = /\/([^\.\/]+)\.git$/.exec(originUrl)[1];
runCommand(
  `npm run ng -- build --prod --aot --base-href="/${gitHubProjectName}/"`,
  { stdio: 'inherit' }
);
const distPath = join(__dirname, '../dist/', project.defaultProject);
runCommand('git init', { stdio: 'inherit', cwd: distPath });
runCommand('git add .', { stdio: 'inherit', cwd: distPath });
runCommand('git commit -m "update GitHub Pages"', {
  stdio: 'inherit',
  cwd: distPath,
});
runCommand('git checkout -b gh-pages', {
  stdio: 'inherit',
  cwd: distPath,
});
runCommand(`git remote add origin ${originUrl}`, {
  stdio: 'inherit',
  cwd: distPath,
});
runCommand(`git push origin gh-pages --force`, {
  stdio: 'inherit',
  cwd: distPath,
});
console.log(chalk.green('Publish complete.'));

function runCommand(command: string, options?: childProcess.ExecSyncOptions) {
  console.log(chalk.gray(`running command "${command}"...`));
  return childProcess.execSync(command, options);
}
