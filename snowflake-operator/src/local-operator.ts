import SnowService from './snow-service';
import cron from 'node-cron'

const snowService = SnowService.instance();

cron.schedule('*/5 * * * * *', async () => {
    console.log('Running Node Operator');
    let flows = await snowService.listFlowsToBeExecuted();
    for (let flow of flows) {
        snowService.excecuteFlow(flow);
    }
});