import React from 'react';
import { notification } from 'antd';
// import Link from '../components/Link';

export function notify({ message = '', description = undefined as any, txid = '', type = 'info', placement = 'bottomLeft' }) {
  if (txid) {
    description = <></>;
  }
  (notification as any)[type]({
    message: <span>{message}</span>,
    description: <span>{description}</span>,
    placement,
  });
}
