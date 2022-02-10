import SnowService from './snow-service';
const snowService = SnowService.instance();

async function main() { 
  // let expiredFlows = await snowService.listExpiredFlows();
  // console.log('Expired flows: ', expiredFlows);

  // for (let flow of expiredFlows) {
  //   await snowService.markTimedFlowAsError(flow);
  // }
 
}

main().then(() => console.log('Success'));