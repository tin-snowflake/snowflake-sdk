import _ from 'lodash';
import { notify } from './notifications';
import { QuietError } from './errorHandlers';

export const handleSelectChange = (object, field, value, updateState?) => {
  _.set(object, field, value);
  if (updateState) updateState();
};

export const handleInputChange = (obj, updateState?) => e => {
  _.set(obj, e.target.name, e.target.value);
  if (updateState) updateState();
};

// wrap an onclick handler with this smartClick to get automatic error notification.
export async function smartClick(fn: () => Promise<any>) {
  try {
    await fn();
  } catch (e) {
    console.log('Error processing action', e);
    if (e['code'] == 4001) return; // user cancel wallet, show nothing.
    if (e instanceof QuietError) return; // program want to keep quiet, show nothing.
    notify({
      message: 'Error processing action',
      type: 'error',
      description: e.toString(),
    });
  }
}
