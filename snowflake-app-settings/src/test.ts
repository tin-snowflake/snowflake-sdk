import AppSettingsService from './app-serttings-service';
const snowService = AppSettingsService.instance();

async function main() { 
  // await snowService.initAppSettingsAccount();
  // await snowService.checkOperator();
  await snowService.retriveAppSettingsAccount();
  // await snowService.registerOperator("2m3hGPuvpmjwVt6gD8juQ1VckmDcdKWoqmeu7F9afpnc");

}

main().then(() => console.log('Success'));