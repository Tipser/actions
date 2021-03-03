const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  try {
    const context = github.context;

    const token = core.getInput("token", {required: true});
    const deployment_id = core.getInput("deployment_id", {required: true});
    const required_jobs = JSON.parse(core.getInput("required_jobs", {required: true}));
    const target_url = `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${context.sha}/checks`;

    const octokit = github.getOctokit(token,
      {
        previews: ["flash-preview"],
      }
    );

    const failedJobs = Object.values(required_jobs).map(job => job.result).some(result => result=="failure")
    await octokit.repos.createDeploymentStatus(
      {
        ...context.repo,
        deployment_id,
        state: failedJobs ? "failure" : "success",
        target_url,
      }
    );
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run();
