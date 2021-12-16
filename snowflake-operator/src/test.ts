import SnowService from './snow-service';
const snowService = SnowService.instance();

async function main() { 
  // let expiredFlows = await snowService.listExpiredFlows();
  // console.log('Expired flows: ', expiredFlows);

  // for (let flow of expiredFlows) {
  //   await snowService.markTimedFlowAsError(flow);
  // }
 
  let flows = await snowService.listFlowsToBeExecuted();
  console.log('Flows: ', flows);
  
  for (let flow of flows) {
    if (flow.publicKey.toBase58().endsWith('8tjGLSgkhQh')) {
      console.log('Executing flow: ', flow.account.name);
      
      await snowService.excecuteFlow(flow);
    }
    
  } 
}

main().then(() => console.log('Success'));