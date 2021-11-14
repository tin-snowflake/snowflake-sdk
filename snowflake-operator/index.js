const anchor = require('@project-serum/anchor');
anchor.setProvider(anchor.Provider.env());

const idl = JSON.parse(require('fs').readFileSync('idl/snowflake.json', 'utf8'));
const programId = new anchor.web3.PublicKey('86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63');

const program = new anchor.Program(idl, programId);
const FLOW_RETRY_WINDOW = 300;

exports.handler = async function() {
  console.log("Running Node Operator");

  let flows = await listFlowsToBeExecuted();

  for (let flow of flows) {
    excecuteFlow(flow);
  }
}

async function listFlowsToBeExecuted() {
  let results = [];
  let dataSizeFilter = {
    dataSize: 5000,
  };

  try {
    const allFlows = await program.account.flow.all([dataSizeFilter]);

    allFlows.forEach(function (flow) {
      if (shouldExecuteFlow(flow)) {
        results.push(flow);
      }
    });
  } catch (error) {
    console.log('Error listing flows to be executed: ', error);
  }
  
  return results;
}

function shouldExecuteFlow(flow) {
  let nextExecutionTime = flow.account.nextExecutionTime.toNumber();
  let now = Math.floor(Date.now() / 1000);
  return nextExecutionTime > 0 && nextExecutionTime < now && now - nextExecutionTime < FLOW_RETRY_WINDOW;
}

async function excecuteFlow(flow) {
  console.log('Executing flow: ', flow);

  try {
    let flowAddress = flow.publicKey;

    let accounts = {flow: flowAddress};

    let remainAccountMetas = flow.account.actions.reduce(
      (result, current) => result.concat(current.accounts), 
      []
    );

    let targetProgramMetas = flow.account.actions.reduce(
      (result, current) =>
        result.concat({
          pubkey: current.program,
          isSigner: false,
          isWritable: false,
        }),
      []
    );

    remainAccountMetas = remainAccountMetas.concat(targetProgramMetas);

    const tx = await program.rpc.executeScheduledFlow({
      accounts: accounts,
      remainingAccounts: remainAccountMetas,
    });
  
    console.log('Your transaction signature', tx);
  } catch (error) {
    console.log('Error excecuting flow: ', error);
  }
}

// async function main() { 
//   let flows = await listFlowsToBeExecuted();
//   for (let flow of flows) {
//     await excecuteFlow(flow);
//   }
// }

// main().then(() => console.log('Success'));
