// import SnowService from './snow-service';
import log4js from 'log4js';

// const snowService = SnowService.instance();

log4js.configure('log4js.json');
const logger = log4js.getLogger("Operator");

async function main() { 
  // let expiredFlows = await snowService.listExpiredFlows();
  // console.log('Expired flows: ', expiredFlows);

  // for (let flow of expiredFlows) {
  //   await snowService.markTimedFlowAsError(flow);
  // }
  logger.info('Logger Info');
  
}

main().then(() => console.log('Success'));