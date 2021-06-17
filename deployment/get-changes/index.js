const core = require("@actions/core");
const decompress = require('decompress');
const github = require("@actions/github");

async function run() {
  try {
    const context = github.context;

    core.info("Read inputs...")
    const token = core.getInput("token", {required: true});
    const environment = core.getInput("environment", {required: true});
    const lower_environment = core.getInput("lower_environment", {required: true});
    const app_version = core.getInput("app_version");
    const config_version = core.getInput("config_version");

    const octokit = github.getOctokit(token);

    core.info("Start processing...")
    const latestEnvironmentDeploymentData = await getDeploymentData(octokit, context, environment);
    let latestLowerEnvironmentDeploymentData;
    if (app_version == "" || config_version == "") {
      latestLowerEnvironmentDeploymentData = await getDeploymentData(octokit, context, lower_environment);
    }

    core.info("Set outputs...")
    let outputs = {
      previous_app_version: latestEnvironmentDeploymentData.app_version,
      previous_config_version: latestEnvironmentDeploymentData.config_version,
      new_app_version: app_version || latestLowerEnvironmentDeploymentData.app_version,
      new_config_version: config_version || latestLowerEnvironmentDeploymentData.config_version,
    }
    outputs = {
      ...outputs,
      app_version_git_compare: `https://github.com/${context.repo.owner}/${context.repo.repo}/compare/${outputs.previous_app_version.split("-")[0]}...${outputs.new_app_version.split("-")[0]}`,
    }
    core.startGroup('Outputs');
    Object.entries(outputs).forEach(([k, v]) => {
        core.setOutput(k, v);
        core.info(`  ${k}: ${v}`);
    });
    core.endGroup();

  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run();

async function getDeploymentData(octokit, context, environment, state="SUCCESS") {
  core.info(`Get ${state} deployments info for ${environment} env on ${context.repo.owner}/${context.repo.repo}...`);
  const deployments = await octokit.graphql(
    `query ($repo: String!, $owner: String!, $environment: String!) {
        repository(owner: $owner, name: $repo) {
          deployments(environments: [$environment], first: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              databaseId
              latestStatus {
                logUrl
                createdAt
                state
              }
            }
          }
        }
      }`,
    {
      ...context.repo,
      environment
    }
  );
  const latestSearchedDeployment = deployments.repository.deployments.nodes
    .filter(n => n.latestStatus.state == state)[0];
  const latestSearchedDeploymentStatus = latestSearchedDeployment.latestStatus;

  let latestSearchedDeploymentData = {
    deployment_id: latestSearchedDeployment.databaseId,
    log_url: latestSearchedDeploymentStatus.logUrl,
  };

  const run_id = latestSearchedDeploymentStatus.logUrl.split("/").pop();
  const artifactList = await octokit.actions.listWorkflowRunArtifacts(
    {
      ...context.repo,
      run_id
    }
  );
  const filename = "_github_workflow_run_inputs.json";
  const artifact_id = artifactList.data.artifacts.filter(a => a.name == filename).pop().id;
  const artifact = await octokit.actions.downloadArtifact(
    {
      ...context.repo,
      artifact_id,
      archive_format: "zip"
    }
  );
  const decompressedArtifact = await decompress(Buffer.from(artifact.data));

  latestSearchedDeploymentData = {
    ...latestSearchedDeploymentData,
    ...JSON.parse(decompressedArtifact[0].data),
  };
  return latestSearchedDeploymentData;
}

