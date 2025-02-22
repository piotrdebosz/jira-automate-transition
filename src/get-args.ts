import * as core from "@actions/core";
import { parse } from "yaml";
import { readFileSync } from "fs";
import { ParsedResult, JiraConfig, JiraConfigFile } from "./interfaces";

const configPath = `${process.env.HOME}/jira/config.yml`;

const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;

const getArgs: () => ParsedResult | void = () => {
  const resolveTicketIdsScript = core.getInput("resolve-ticket-ids-script");

  const resolveTicketIdsFunc =
    resolveTicketIdsScript !== ""
      ? new AsyncFunction("branchName", resolveTicketIdsScript)
      : undefined;

  let jiraConfig: Partial<JiraConfig> = {};
  jiraConfig.jiraIssueId = core.getInput("jira-issue-id");
  try {
    jiraConfig.jiraAccount = core.getInput("jira-account");
    jiraConfig.jiraEndpoint = core.getInput("jira-endpoint");
    jiraConfig.jiraToken = core.getInput("jira-token");

    const { jiraAccount, jiraEndpoint, jiraIssueId, jiraToken } = jiraConfig;

    core.info(`config: ${JSON.stringify(jiraConfig)}, jiraEndpoint: ${jiraEndpoint}`);

    if ((!jiraIssueId || jiraIssueId === "") && !resolveTicketIdsFunc) {
      return {
        exit: true,
        success: false,
        message: "Jira issue id and ticket id resolver not found, exiting...",
        parsedInput: undefined
      };
    }

    Array.from([jiraAccount, jiraEndpoint, jiraToken]).forEach(value => {
      if (value === "" || !value) throw new Error("");
    });
  } catch (error) {
    console.log(`Missing input, using config file ${configPath} instead...`);
    const {
      token,
      baseUrl,
      email
    }: JiraConfigFile = parse(readFileSync(configPath, "utf8"));
    jiraConfig.jiraAccount = email;
    jiraConfig.jiraEndpoint = baseUrl;
    jiraConfig.jiraToken = token;
  }

  core.info(`cofigFile: ${JSON.stringify(readFileSync(configPath, "utf8"))}`);

  core.info(`after throw: config: ${JSON.stringify(jiraConfig)}, jiraEndpoint: ${jiraConfig.jiraEndpoint}`);

  const githubToken = core.getInput("github-token", { required: true });
  const colReviewRequested = core.getInput(
    "column-to-move-to-when-review-requested",
    { required: true }
  );
  const colChangesRequested = core.getInput(
    "column-to-move-to-when-changes-requested",
    { required: true }
  );
  const colMerged = core.getInput("column-to-move-to-when-merged");
  const colMergedDevTested = core.getInput("column-to-move-to-when-merged-to-be-dev-tested");
  const devTestedLabel = core.getInput("pr-label-to-be-dev-tested");

  const { jiraAccount, jiraEndpoint, jiraToken, jiraIssueId } = jiraConfig;

  const jiraProject = jiraIssueId!.split(/-/g)[0];
  const jiraIssueNumber = Number(jiraIssueId!.split(/-/g)[1]);

  return {
    success: true,
    exit: false,
    parsedInput: {
      githubToken,
      columnToMoveToWhenChangesRequested: colChangesRequested,
      columnToMoveToWhenReviewRequested: colReviewRequested,
      columnToMoveToWhenMerged: colMerged,
      columnToMoveToWhenMergedToBeDevTested: colMergedDevTested,
      prLabelToBeDevTested: devTestedLabel,
      jiraAccount,
      jiraEndpoint,
      jiraIssueId,
      jiraToken,
      jiraProject,
      jiraIssueNumber,
      jiraTokenEncoded: Buffer.from(`${jiraAccount}:${jiraToken}`).toString(
        "base64"
      ),
      resolveTicketIdsFunc
    }
  };
};

export { getArgs };
