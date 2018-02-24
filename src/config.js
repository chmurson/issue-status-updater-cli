const homeDir = require('homedir');
const fs = require('fs');
const path = require('path');

/**
 * @type {string}
 */
const configFilePath = path.resolve(homeDir(), '.issue-status-updater.config.json');

/**
 * @return {{ticketPrefix: RegExp, apiUrl: string, authorizationToken: string}}
 */
module.exports.readConfig = function readConfig() {
  const jira = readFile().jira;

  try {
    jira.ticketRegex = new RegExp(jira.ticketRegex);
  } catch (e) {
    console.error(`Couldn't parse regex pattern at 'ticketRegex' of config file at ${configFilePath}`);
  }

  return jira;
};

function readFile() {
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`Couldn't read configuration file at: ${configFilePath}`)
  }

  try {
    return JSON.parse(fs.readFileSync(configFilePath));
  } catch (e) {
    throw new Error(`Couldn't parse file at ${configFilePath}`)
  }
}