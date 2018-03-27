const request = require('request-promise-native')
const { readConfig } = require('./config')
const config = readConfig()
/**
 * @param {string} current
 * @param {string} target
 * @param {{from: String, to: String, path: String[], alsoReverse: Boolean}[]} taskStatusesPaths - all possible task statuses paths
 */
module.exports.getTransitionsNeeded = function getTransitionsNeeded(current, target, taskStatusesPaths) {
  const matchNormalOrReversePath = pathObject =>
    (pathObject.from === current && pathObject.to === target) ||
    (pathObject.from === target && pathObject.to === current && pathObject.alsoReverse)
  const path = taskStatusesPaths.find(matchNormalOrReversePath)

  if (!path) {
    return [target]
  }
  const isReverse = path.from === target
  return [...(isReverse ? [...path.path].reverse() : path.path), target]
}

/**
 * @param jiraTask
 * @param transitionId
 * @return {Promise.<*>}
 */
module.exports.doTransition = async function doTransition(jiraTask, transitionId) {
  return authorizedJiraRequest(`/issue/${jiraTask}/transitions/`, {
    method: 'POST',
    body: {
      transition: {
        id: transitionId
      }
    }
  })
}

/**
 * @param {string} jiraTask
 * @return {Promise.<*>}
 */
module.exports.getTaskPossibleTransitions = async function getTaskPossibleTransitions(jiraTask) {
  return authorizedJiraRequest(`/issue/${jiraTask}/transitions/`).then(response => response.transitions)
}

/**
 * @param {string} jiraTask
 * @return {Promise.<*>}
 */
module.exports.getTask = getTask

/**
 * @param {string} jiraTask
 * @return {Promise.<*>}
 */
async function getTask(jiraTask) {
  return authorizedJiraRequest(`/issue/${jiraTask}/`)
}

/**
 * @param uri
 * @param options
 * @return {*}
 */
module.exports.authorizedJiraRequest = authorizedJiraRequest

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
  } catch (e) {
    throw Error(e.error ? e.error.errorMessages.join(',') : e)
  }
}
