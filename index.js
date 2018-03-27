#!/usr/bin/env node

const { readConfig } = require('./src/config')
const { getTask, getTaskPossibleTransitions, doTransition, getTransitionsNeeded } = require('./src/jiraApi')

const config = readConfig()

const jiraTask = config.tickerPrefix + process.argv[2] //e.g. '2227';
const targetStatus = process.argv[3] //e.g.IN_PROGRESS;

if (!jiraTask || !targetStatus || jiraTask === '-h' || jiraTask === '--help') {
  console.log('Usage: isu [taskId] [status]', '\nExample: isu 1234 Open')
  process.exit(1)
}

const targetTaskStatusObj = getTaskStatusObject(config.taskStatuses, targetStatus)
const taskStatusesPaths = config.taskStatusesPaths || []

start({ jiraTask, targetStatus: targetTaskStatusObj.name, taskStatusesPaths }).then(
  () => process.exit(0),
  error => console.error(`Error: ${error.message || 'Unknown'}`) && process.exit(1)
)

/**
 * @param {String} jiraTask
 * @param {String}
 * @return {Promise.<void>}
 */
async function start({ jiraTask, targetStatus, taskStatusesPaths }) {
  console.log(`Fetching task ${jiraTask} status...`)
  const taskStatus = await getTaskStatus(jiraTask)
  console.log(`Task ${jiraTask} status:`, taskStatus)
  console.log(`Target status:`, targetStatus)
  if (taskStatus === targetStatus) {
    console.log(`Task already is in desired state. Nothing to do.`)
    return
  }
  const transitionsPath = await getTransitionsNeeded(taskStatus, targetStatus, taskStatusesPaths)

  for (let i in transitionsPath) {
    const nextStatus = transitionsPath[i]
    console.log(`Changing state to ${nextStatus}...`)
    const transition = await getPossibleTransition(nextStatus)
    await doTransition(jiraTask, transition.id)
  }

  console.log('Done!')
}

/**
 * @param {{name: String, shortName: String}[]} taskStatuses
 * @param {String} targetTaskStatus
 */
function validateStatus(taskStatuses, targetTaskStatus) {
  const allPossibleStatuses = taskStatuses.reduce((prev, taskStatus) => {
    prev.push(taskStatus.name)
    prev.push(taskStatus.shortName)
    return prev
  }, [])

  if (!allPossibleStatuses.includes(targetTaskStatus)) {
    console.error('Status need to be one of ', allPossibleStatuses.join(', '))
    process.exit(1)
  }
}

/**
 * @param {{name: String, shortName: String}[]} taskStatuses
 * @param {String} targetTaskStatus
 */
function getTaskStatusObject(taskStatuses, targetTaskStatus) {
  validateStatus(config.taskStatuses, targetStatus)

  const targetTaskStatusObject = taskStatuses.find(taskStatus =>
    [taskStatus.name, taskStatus.shortName].includes(targetTaskStatus)
  )

  return targetTaskStatusObject
}

/**
 * @param {string} nextStatus
 * @return {Promise.<{}|undefined>}
 */
async function getPossibleTransition(nextStatus) {
  const possibleTransitions = await getTaskPossibleTransitions(jiraTask)
  const transition = possibleTransitions.find(x => x.name === nextStatus)
  if (!transition) {
    throw new Error(`No possible transition to ${nextStatus}.`)
  }
  return transition
}

/**
 * @param {String} [taskNumber]
 * @return {Promise.<string>}
 */
async function getTaskStatus(taskNumber) {
  const response = await getTask(taskNumber)
  if (response.fields && response.fields.status && response.fields.status.name) {
    return response.fields.status.name
  }

  throw new Error(`Cannot retrieve status name for the task`)
}
