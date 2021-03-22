const artifact = require("@actions/artifact");
const core = require("@actions/core");
const fs = require('fs');
const github = require("@actions/github");

async function run() {
  try {
    const inputs = core.getInput("inputs", {required: true});

    for (const [key, value] of Object.entries(JSON.parse(inputs))) {
      core.warning(`Inputs | ${key}: ${value}`)
    };

    const filename = "_github_workflow_run_inputs.json";
    fs.writeFileSync(filename, inputs);
    const artifactClient = artifact.create()
    const artifactName = filename;
    const files = [ filename ];
    const rootDirectory = '.'
    await artifactClient.uploadArtifact(artifactName, files, rootDirectory);

  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run();
