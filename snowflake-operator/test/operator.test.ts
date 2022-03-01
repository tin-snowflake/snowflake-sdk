import SnowService from "../src/services/snow-service";

let snowService: SnowService;

beforeAll(() => {
  snowService = SnowService.instance();
});

test("list all flows", async () => {
  const flows = await snowService.listAllFlows();

  console.log(flows);
});

test("list flows to be executed", async () => {
  // const flowsToBeExecuted = await snowService.listFlowsToBeExecuted();

  // console.log(flowsToBeExecuted);
});

test("list expired flows", async () => {
  // const expiredFlows = await snowService.listExpiredFlows();

  // console.log(expiredFlows);
});
