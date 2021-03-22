const core = require("@actions/core");
const decompress = require('decompress');
const github = require("@actions/github");

async function run() {
  try {
    const context = github.context;

    const token = core.getInput("token", {required: true});
    const environment = core.getInput("environment", {required: true});
    const state = core.getInput("state", {required: true});
    const get_input = core.getInput("get_input", {required: true});

    const octokit = github.getOctokit(token);

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

    if (get_input == 'true') {
      const run_id = latestSearchedDeploymentStatus.logUrl.split("/").pop();
      const artifactList = await octokit.actions.listWorkflowRunArtifacts(
        {
          ...context.repo,
          run_id
        }
      );
      const filename = "_github_workflow_run_inputs.json";
      const artifact_id = artifactList.data.artifacts.filter(a => a.name == filename).pop().id
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
    }

    core.startGroup('Outputs');
    Object.entries(latestSearchedDeploymentData).forEach(([k, v]) => {
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
