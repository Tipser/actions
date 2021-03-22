const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  try {
    const context = github.context;

    const token = core.getInput("token", {required: true});
    const ref = core.getInput("ref", {required: true});
    const environment = core.getInput("environment", {required: true});
    const required_contexts = core.getInput("required_contexts") ? JSON.parse(core.getInput("required_contexts")) : null;
    const target_url = `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;

    const octokit = github.getOctokit(token,
      {
        previews: ["flash-preview"],
      }
    );

    const deployment = await octokit.repos.createDeployment(
      {
        ...context.repo,
        environment,
        ref,
        auto_merge: false,
        required_contexts,
      }
    );
    const deployment_id = deployment.data.id;
    core.setOutput("deployment_id", deployment_id);

    await octokit.repos.createDeploymentStatus(
      {
        ...context.repo,
        deployment_id,
        state: "in_progress",
        target_url,
      }
    );
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run();
