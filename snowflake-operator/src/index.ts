import SnowService from './snow-service';

const snowService = SnowService.instance();

export const handler = async () => {
    console.log('Running Node Operator');
    let flows = await snowService.listFlowsToBeExecuted();
    for (let flow of flows) {
        await snowService.excecuteFlow(flow);
    }
};