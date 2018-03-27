#!/usr/bin/env node

const { readConfig } = require('./src/config')
const { getTask } = require('./src/jiraApi')
const get = require('lodash.get')

const config = readConfig()

const jiraTask = config.tickerPrefix + process.argv[2] //e.g. '2227';

if (!jiraTask || jiraTask === '-h' || jiraTask === '--help') {
  console.log('Usage: git-branch [taskId]', '\nExample: git-branch 1234')
  process.exit(1)
}

async function start(issueId) {
  const task = await getTask(issueId)

  const issueType = get(task, 'fields.issuetype.name')
  const summary = get(task, 'fields.summary')

  const branchName = getBranchName(issueId, issueType, summary)
  console.log(branchName)
}

function getBranchName(issueId, issueType, summary) {
  if (!issueType || !summary || !issueId) {
    throw new Error(`Cannot receive issue type's name or it's summary`)
  }

  const prefix = getBranchPrefixForIssueType(issueType)
  const normalizedSummary = normalizeSummary(summary)
  return `${prefix}/${issueId}-${normalizedSummary}`
}

function getBranchPrefixForIssueType(issueType) {
  return (
    {
      Bug: 'bugfix',
      Issue: 'feature'
    }[issueType] || 'task'
  )
}

function normalizeSummary(summary) {
  return `${summary}`
    .toLowerCase()
    .replace(/\[[^\]]+]\s?/g, '') //remove [FE] like elements
    .replace(/[^A-Za-z0-9_\s]/g, '') //remove all non word characters with exception of white spaces
    .replace(/\s+/g, ' ') //merge following whitespaces
    .trim()
    .replace(/\s/g, '-')
    .slice(0, 96) // some subjctive maximum length of branch name
}

start(jiraTask).catch(console.error.bind(this))
