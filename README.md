### What it does?

It's a CLI tool that changes issue's statutes. Currently only Jira is supported. 

### How to use it ?

Let's say you started to work on task 2655, and want to move it into In Progress state.
```bash
isu 2655 "In Progress"
```
outputs:
```                                                                                                                              
Fetching task SSLP-2655 status...
Task SSLP-2655 status: Estimation Needed
Target status: In Progress
Changing state to Open...
Changing state to In Progress...
Done!
```
Take a notice the path of states: `Estimation Needed => to Open => In Progress`. The whole update - that in some 
cases would require two operations - is done with single command. 

### How to install?

First step is to install the tool.
```bash
npm install -g issue-status-updater 
```

Second is to configure it. Edit following file if your favorite editor.
```bash
~/.issue-status-updater.config.json
```

### Configuration

- `jira.ticketPrefix` - Something like `XYZ-`, so it matches tickets ids like `XYZ-1` or `XYZ-123`
- `jira.apiUrl` - This is the url to the rest api of Jira
- `jira.authorizationToken` - This is token for Basic Auth

> `authorizationToken` You can create it easily by converting following text `username:passowrd` with Base64, e.g. by running following JS code (of course you need to replace `username` and `password` strings):
> ```js
> var b = new Buffer('username:password');
> console.log(b.toString('base64'));
> ```

- `jira.taskStatues` All possible task statuses. `shortName` can be passed an argument instead of `name`.  
- `jira.taskStatusesPath` These are paths of the Jira's workflow. Sometimes more steps than one are required to get task from one
status to another. To make this update possible with one command, paths between non neighbour statuses have to be defined.

> This data could be extracted directly from Jira, rather than kept in following configuration file, but
there is no guarantee user has access to the workflow data. To simplify the implementation paths are required always to be defined in configuration file. 
That may change in the future though.     

#### Example of configuration
```json
{
  "jira": {
    "ticketPrefix": "XYZ-",
    "apiUrl": "https://jira.my-domain.com/rest/api",
    "authorizationToken": "base64token",
    "taskStatuses": [
      {
        "name": "Open",
        "shortName": "O"
      },
      {
        "name": "In Progress",
        "shortName": "P"
      },
      {
        "name": "On Hold",
        "shortName": "OH"
      },
      {
        "name": "Estimation Needed",
        "shortName": "Est"
      },
      {
        "name": "PV Validation",
        "shortName": "PV"
      },
      {
        "name": "Code Review",
        "shortName": "CR"
      }
    ],
    "taskStatusesPaths": [
      {
        "from": "Estimation Needed",
        "to": "In Progress",
        "path": [
          "Open"
        ],
        "alsoReverse": true
      },
      {
        "from": "Estimation Needed",
        "to": "Code Review",
        "path": [
          "Open",
          "In Progress"
        ],
        "alsoReverse": true
      }
    ]
  }
}

