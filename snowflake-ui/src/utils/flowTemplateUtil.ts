import { RecurringUIOption, RETRY_WINDOW, TriggerType } from '../models/flow';
import moment from 'moment';
import { ENV } from './web3';
import { ACTION_TYPES } from './flowActionUtil';

const defaultCron = '0 10 * * *';
let defaultScheduleTime = moment().add(1, 'week'); // 1 week from now

export const BLANK_TEMPLATE = {
  retryWindow: RETRY_WINDOW,
  triggerType: TriggerType.Time,
  cron: defaultCron,
  recurring: RecurringUIOption.No.toString(),
  nextExecutionTime: defaultScheduleTime,
  remainingRuns: -999,
  actions: [],
};

export enum TEMPLATE {
  blank = 'blank',
  recurringPayment = 'recurringPayment',
  sampleProgramConditionFlow = 'sampleProgramConditionFlow',
  oneOffScheduledCustomAction = 'oneOffScheduledCustomAction',
  orcaDCA = 'orcaDCA',
  pythOracleTrigger = 'pythOracleTrigger',
}

export const FLOW_TEMPLATES = {
  [ENV.devnet]: {
    [TEMPLATE.blank]: BLANK_TEMPLATE,
    [TEMPLATE.recurringPayment]: {
      name: 'Recurring Payment',
      retryWindow: RETRY_WINDOW,
      triggerType: TriggerType.Time,
      cron: '0 0 1 * *',
      recurring: RecurringUIOption.Yes.toString(),
      remainingRuns: 2,
      actions: [],
    },
    [TEMPLATE.sampleProgramConditionFlow]: {
      name: 'A sample program condition flow',
      retryWindow: RETRY_WINDOW,
      triggerType: TriggerType.ProgramCondition,
      cron: defaultCron,
      recurring: RecurringUIOption.No,
      remainingRuns: 2,
      actions: [
        {
          name: 'custom',
          actionCode: ACTION_TYPES.customAction.code,
          instruction: '74b89fceb3e0b22a',
          program: 'ETwBdF9X2eABzmKmpT3ZFYyUtmve7UWWgzbERAyd4gAC',
          accounts: [
            {
              pubkey: '5jo4Lh2Z9FGQ87sDhUBwZjNZdL15MwdeT5WUXKfwFSZY',
              isSigner: false,
              isWritable: false,
            },
          ],
        },
      ],
    },
    [TEMPLATE.oneOffScheduledCustomAction]: {
      name: 'A once-off time scheduled automation',
      retryWindow: RETRY_WINDOW,
      triggerType: TriggerType.Time,
      cron: defaultCron,
      recurring: RecurringUIOption.No,
      nextExecutionTime: defaultScheduleTime,
      remainingRuns: -999,
      actions: [
        {
          name: 'custom',
          actionCode: ACTION_TYPES.customAction.code,
          instruction: '74b89fceb3e0b22a',
          program: 'ETwBdF9X2eABzmKmpT3ZFYyUtmve7UWWgzbERAyd4gAC',
          accounts: [
            {
              pubkey: '5jo4Lh2Z9FGQ87sDhUBwZjNZdL15MwdeT5WUXKfwFSZY',
              isSigner: false,
              isWritable: false,
            },
          ],
        },
      ],
    },
    [TEMPLATE.orcaDCA]: {
      name: 'Dollar cost average swap on Orca',
      retryWindow: RETRY_WINDOW,
      triggerType: TriggerType.Time,
      cron: '0 8 * * *',
      recurring: RecurringUIOption.Yes.toString(),
      remainingRuns: 5,
      actions: [
        {
          name: 'orca',
          actionCode: ACTION_TYPES.orcaSwapAction.code,
          amountIn: 10,
        },
      ],
    },
    [TEMPLATE.pythOracleTrigger]: {
      name: 'Sample Pyth oracle price condition triggerred automation',
      retryWindow: RETRY_WINDOW,
      triggerType: TriggerType.ProgramCondition,
      cron: defaultCron,
      recurring: RecurringUIOption.No,
      remainingRuns: 1,
      actions: [
        {
          name: 'pyth',
          actionCode: ACTION_TYPES.priceCheckAction.code,
          priceAccount: 'A1WttWF7X3Rg6ZRpB2YQUFHCRh1kiXV8sKKLV3S9neJV',
          condition: 1,
          targetPrice: 6.5,
        },
        {
          name: 'orca',
          actionCode: ACTION_TYPES.orcaSwapAction.code,
          amountIn: 10,
        },
      ],
    },
  },
};
