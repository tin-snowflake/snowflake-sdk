import SnowService from './snow-service';
import cron from 'node-cron'
import log4js from 'log4js';

log4js.configure('log4js.json');
const logger = log4js.getLogger("Operator");

const snowService = SnowService.instance();

cron.schedule('*/5 * * * * *', async () => {
  logger.info('Running Node Operator');

  let flows = await snowService.listFlowsToBeExecuted();
  for (let flow of flows) {
    snowService.excecuteFlow(flow);
  }

  let expiredFlows = await snowService.listExpiredFlows();
  for (let flow of expiredFlows) {
    snowService.markTimedFlowAsError(flow);
  }
});