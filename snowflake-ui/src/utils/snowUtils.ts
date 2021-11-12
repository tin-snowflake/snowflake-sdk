import { PublicKey } from '@solana/web3.js';
import moment from 'moment';

export function toPublicKey(keyStr) {
  try {
    return new PublicKey(keyStr);
  } catch (e) {
    console.log('failed to convert keyStr to PublicKey', e);
    return null;
  }
}

export function formatUnixTimeStamp(unixTimestamp) {
  return moment.unix(unixTimestamp).format('MMMM D, YYYY h:mm A');
}

class QuietError extends Error {
  constructor(msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, QuietError.prototype);
  }
}
