import SnowService from './snow-service';

const snowService = SnowService.instance();

exports.lambdaHandler = async () => {
    console.log('Running Node Operator');
    let flows = await snowService.listFlowsToBeExecuted();
    for (let flow of flows) {
        snowService.excecuteFlow(flow);
    }
};