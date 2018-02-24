const request = require('request-promise-native');
const { readConfig } = require('./src/config');

const config = readConfig();

const jiraTask = config.tickerPrefix + process.argv[2]; //e.g. '2227';
const targetStatus = process.argv[3]; //e.g.IN_PROGRESS;

const targetTaskStatusObj = getTaskStatusObject(config.taskStatuses, targetStatus);
const taskStatusesPaths = config.taskStatusesPaths || [];

/**
 * @param {String} jiraTask
 * @param {String}
 * @return {Promise.<void>}
 */
async function start({ jiraTask, targetStatus, taskStatusesPaths }) {
  console.log(`Fetching task ${jiraTask} status...`);
  const taskStatus = await getTaskStatus(jiraTask);
  console.log(`Task ${jiraTask} status:`, taskStatus);
  console.log(`Target status:`, targetStatus);
  if (taskStatus === targetStatus) {
    console.log(`Task already is in desired state. Nothing to do.`);
    return;
  }
  const transitionsPath = await getTransitionsNeeded(taskStatus, targetStatus, taskStatusesPaths);

  for (let i in transitionsPath) {
    const nextStatus = transitionsPath[i];
    console.log(`Changing state to ${nextStatus}...`);
    const transition = await getPossibleTransition(nextStatus);
    await doTransition(jiraTask, transition.id);
  }

  console.log('Done!');
}

start({ jiraTask, targetStatus: targetTaskStatusObj.name, taskStatusesPaths }).then(
    () => process.exit(0),
    error => console.error(`Error: ${error.message || 'Unknown'}`) && process.exit(1)
);

/**
 * @param {{name: String, shortName: String}[]} taskStatuses
 * @param {String} targetTaskStatus
 */
function validateStatus(taskStatuses, targetTaskStatus) {
  const allPossibleStatuses = taskStatuses.reduce((prev, taskStatus) => {
    prev.push(taskStatus.name);
    prev.push(taskStatus.shortName);
    return prev;
  }, []);

  if (!allPossibleStatuses.includes(targetTaskStatus)) {
    console.error('Status need to be one of ', allPossibleStatuses.join(', '));
    process.exit(1);
  }
}

/**
 * @param {{name: String, shortName: String}[]} taskStatuses
 * @param {String} targetTaskStatus
 */
function getTaskStatusObject(taskStatuses, targetTaskStatus) {
  validateStatus(config.taskStatuses, targetStatus);

  const targetTaskStatusObject = taskStatuses
      .find(taskStatus => [taskStatus.name, taskStatus.shortName].includes(targetTaskStatus));

  return targetTaskStatusObject;
}


/**
 * @param {string} nextStatus
 * @return {Promise.<{}|undefined>}
 */
async function getPossibleTransition(nextStatus) {
  const possibleTransitions = await getTaskPossibleTransitions(jiraTask);
  const transition = possibleTransitions.find(x => x.name === nextStatus);
  if (!transition) {
    throw new Error(`No possible transition to ${nextStatus}.`);
  }
  return transition
}

/**
 * @param {String} [taskNumber]
 * @return {Promise.<string>}
 */
async function getTaskStatus(taskNumber) {
  const response = await getTask(taskNumber);
  if (response.fields && response.fields.status && response.fields.status.name) {
    return response.fields.status.name;
  }

  throw new Error(`Cannot retrieve status name for the task`);
}

/**
 * @param {string} current
 * @param {string} target
 * @param {{from: String, to: String, path: String[], alsoReverse: Boolean}[]} taskStatusesPaths - all possible task statuses paths
 */
function getTransitionsNeeded(current, target, taskStatusesPaths) {
  const matchNormalOrReversePath = pathObject => (pathObject.from === current && pathObject.to === target) ||
      (pathObject.from === target && pathObject.to === current && pathObject.alsoReverse);
  const path = taskStatusesPaths.find(matchNormalOrReversePath);

  if (!path) {
    return [target];
  }
  const isReverse = path.from === target;
  return [...(isReverse ? [...path.path].reverse() : path.path), target];
}

/**
 * @param jiraTask
 * @param transitionId
 * @return {Promise.<*>}
 */
async function doTransition(jiraTask, transitionId) {
  return authorizedJiraRequest(`/issue/${jiraTask}/transitions/`, {
    method: 'POST',
    body: {
      transition: {
        id: transitionId
      }
    }
  });
}

/**
 * @param {string} jiraTask
 * @return {Promise.<*>}
 */
async function getTaskPossibleTransitions(jiraTask) {
  return authorizedJiraRequest(`/issue/${jiraTask}/transitions/`).then(response => response.transitions);
}

/**
 * @param {string} jiraTask
 * @return {Promise.<*>}
 */
async function getTask(jiraTask) {
  return authorizedJiraRequest(`/issue/${jiraTask}/`);
}

/**
 * @param uri
 * @param options
 * @return {*}
 */
async function authorizedJiraRequest(uri, options = {}) {
  try {
    return await request({
      uri: `${config.apiUrl}/2${uri}`,
      headers: {
        authorization: `Basic ${config.authorizationToken}`
      },
      json: true,
      ...options
    })
  }
  catch (e) {
    throw Error(e.error.errorMessages.join(','));
  }

}