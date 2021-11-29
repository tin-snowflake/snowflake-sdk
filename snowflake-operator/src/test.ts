import SnowService from './snow-service';
const snowService = SnowService.instance();

async function main() { 
  let flows = await snowService.listFlowsToBeExecuted();
}

main().then(() => console.log('Success'));