const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  try {
    const context = github.context;

    const token = core.getInput("token", {required: true});
    const deployment_id = core.getInput("deployment_id", {required: true});
    const required_jobs = JSON.parse(core.getInput("required_jobs", {required: true}));
    const target_url = `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;

    const octokit = github.getOctokit(token,
      {
        previews: ["flash-preview"],
      }
    );

    const failedJobs = Object.entries(required_jobs).filter(job => job[1].result==="failure").map(job => job[0]);
    const success = (failedJobs.length===0);

    await octokit.repos.createDeploymentStatus(
      {
        ...context.repo,
        deployment_id,
        state: success ? "success" : "failure",
        target_url,
      }
    );
    if (success) core.info("Marking the deployment as successful.")
    else core.setFailed(`There are failed jobs in the workflow: ${failedJobs}`);

  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run();
