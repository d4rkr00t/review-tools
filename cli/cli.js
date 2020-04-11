#!/usr/bin/env node

let cli = require("@opaline/core").default;
let pkg = require("../package.json");
let config = {
  cliName: "review",
  cliVersion: pkg.version,
  cliDescription: pkg.description,
  isSingleCommand: true,
  commands: {
    "index": {
      commandName: "index",
      meta: {"title":"Select reviewers based on changed files.","description":"","usage":"review --num 2 --branch master --ignore bitbucket-pipelines","examples":[],"shouldPassInputs":false,"options":{"num":{"title":"Number of reviewers to select","type":"string","default":"2"},"branch":{"title":"Branch to compare with for determining changed files","type":"string","default":"master"},"ignore":{"title":"List of users to ignore from reviewers","type":"string"},"all":{"title":"Show all possible reviewers","type":"boolean"},"verbose":{"title":"Verbose output","type":"boolean"}}},
      load: () => require("./commands/index")
    }
  }
};

cli(process.argv, config);
