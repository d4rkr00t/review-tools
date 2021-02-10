import { exec } from "child_process";
import { promisify } from "util";
import ora from "ora";
import getChangedFiles from "get-changed-files";
import chalk from "chalk";

let pexec = promisify(exec);

/**
 * Select reviewers based on changed files.
 *
 * @usage {cliName} --num 2 --branch master --ignore bitbucket-pipelines
 *
 * @param {string} [num=2]         Number of reviewers to select
 * @param {string} [branch=master] Branch to compare with for determining changed files
 * @param {string} [ignore] List of users to ignore from reviewers
 * @param {boolean} [all] Show all possible reviewers
 * @param {boolean} [verbose] Verbose output
 */
export default async function chooseReviewers(
  num,
  branch,
  ignore = "",
  all = false,
  verbose = false
) {
  let spinner = ora(`Getting changed files since "${branch}"`).start();
  let username = await getActiveUserName();
  let ignoreList = [username]
      .concat(ignore.split(","))
      .filter(ignored => !!ignored);
  let changedFiles = await getChangedFiles({
    mainBranch: branch,
    customGetDiffPoint: undefined,
  });

  spinner.succeed(
    `${changedFiles.changed.length} changed files since "${branch}".`
  );

  if (verbose) {
    console.log();
    console.log(`Changed files:`);
    printFiles(changedFiles.changed);
  }

  let sampledChangedFiles = getArraySample(changedFiles.changed, 150);
  if (verbose) {
    console.log();
    console.log(`Sample of changed files:`);
    printFiles(sampledChangedFiles);
    console.log();
  }

  spinner = ora(
    chalk`Getting last committers for the changed files... {grey [Sample size: < 150 files]}`
  ).start();

  let committers = await getCommitters(sampledChangedFiles, ignoreList);

  spinner.succeed(`${committers.length} possible reviewers selected.`);

  printResult(committers, num, all);
}

async function getCommitters(files, ignoreList) {
  let committers = Object.entries(
    (await Promise.all(files.map((file) => getRecentCommitters(file))))
      .filter(Boolean)
      .flat(1)
      .reduce((acc, committer) => {
        acc[committer[1]] = (acc[committer[1]] || 0) + parseInt(committer[0]);
        return acc;
      }, {})
  ).filter((item) => !ignoreList.some((ignored) => item[0].includes(ignored)));
  committers.sort((a, b) => b[1] - a[1]);

  return committers;
}

async function getRecentCommitters(file) {
  let { stdout } = await pexec(`git shortlog -sne -- ${file} < /dev/tty`);
  return stdout
    .trim()
    .split("\n")
    .map((line) => line.split("\t").map((item) => item.trim()))
    .filter((item) => item.length >= 2);
}

function getArraySample(array, sampleSize = 50) {
  if (sampleSize >= array.length) {
    return array;
  }
  let newArray = [];
  let taken = new Set();

  while (newArray.length < sampleSize) {
    let index = Math.floor(Math.random() * array.length);
    if (taken.has(index)) {
      continue;
    }

    newArray.push(array[index]);
    taken.add(index);
  }

  return newArray;
}

async function getActiveUserName() {
  return (await pexec("git config user.name")).stdout.split("\n")[0];
}

function printResult(committers, num, all) {
  let matches = committers.splice(
    0,
    Math.min(parseInt(num), committers.length)
  );

  console.log();
  matches.forEach((match) =>
    console.log(chalk`  – {green ${match[0]}}, {yellow ${match[1]}}`)
  );
  console.log();
  committers
    .slice(0, all ? committers.length : 5)
    .forEach((match) =>
      console.log(chalk`  – {dim {grey ${match[0]}}, {grey ${match[1]}}}`)
    );
}

function printFiles(files) {
  files.forEach((file) => {
    console.log(chalk`  – {green ${file}}`);
  });
}
