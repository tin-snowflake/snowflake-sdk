import ProgramSettingsService from './program-settings-service';
const snowService = ProgramSettingsService.instance();

async function main() { 
  await snowService.initProgramSettingsAccount();
  // await snowService.checkOperator();
  // await snowService.retriveProgramSettingsAccount();
  // await snowService.registerOperator("GSm63hkFKvpyPFtWCzR5wwD9NjxRjACDg7Tk3HTvdsHh");
  // await snowService.retriveFlowAccount("9ptMhLMadhxwDYkyFxYpxR7dN6MyvpZh31SAt5qy1f5Z");
}

main().then(() => console.log('Success'));