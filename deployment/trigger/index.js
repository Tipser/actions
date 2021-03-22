const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  try {
    const context = github.context;

    const token = core.getInput("token", {required: true});
    const workflow_id = core.getInput("workflow_id", {required: true});
    const ref = core.getInput("workflow_ref", {required: true});
    const environment = core.getInput("environment", {required: true});
    const app_version = core.getInput("app_version", {required: true});
    const config_version = core.getInput("config_version") || app_version.split("-")[0];
    const source = core.getInput("source", {required: true});
    const apply = core.getInput("apply") || "false";

    const octokit = github.getOctokit(token);

    await octokit.actions.createWorkflowDispatch({
      ...context.repo,
      workflow_id,
      ref,
      inputs: {
        environment,
        app_version,
        config_version,
        source,
        apply
      }
    });
    core.warning(`https://github.com/${context.repo.owner}/${context.repo.repo}/actions/workflows/${workflow_id}?query=branch%3A${ref.split("/").pop()}+event%3Aworkflow_dispatch`);
    core.warning(`https://github.com/${context.repo.owner}/${context.repo.repo}/actions/workflows/${workflow_id}`);
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run();
