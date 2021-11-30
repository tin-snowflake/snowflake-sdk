import SnowService from './snow-service';

const snowService = SnowService.instance();

export const handler = async () => {
    console.log('Running Node Operator');

    let flows = await snowService.listFlowsToBeExecuted();
    console.log('Flows to execute: ', flows);
    for (let flow of flows) {
        await snowService.excecuteFlow(flow);
    }

    let expiredFlows = await snowService.listExpiredFlows();
    console.log('Flows to mark as Error: ', expiredFlows);
    for (let flow of expiredFlows) {
      await snowService.markTimedFlowAsError(flow);
    }
};