import AppSettingsService from './app-serttings-service';
const snowService = AppSettingsService.instance();

async function main() { 
  // await snowService.initAppSettingsAccount();
  // await snowService.checkOperator();
  // await snowService.retriveAppSettingsAccount();
  // await snowService.registerOperator("GSm63hkFKvpyPFtWCzR5wwD9NjxRjACDg7Tk3HTvdsHh");
  await snowService.retriveFlowAccount("5pjsfDB9fYYbQ4nJTFjuFXYxoGMqS546SX8ZUqPG47ay");
}

main().then(() => console.log('Success'));