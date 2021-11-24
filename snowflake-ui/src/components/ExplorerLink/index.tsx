import React from 'react';
import { Typography } from 'antd';
import { shortenAddress } from '../../utils/utils';
import { PublicKey } from '@solana/web3.js';
import { ENV } from '../../utils/web3';

export const ExplorerLink = (props: { address: string | PublicKey; type: string; code?: boolean; style?: React.CSSProperties; length?: number; env?: ENV }) => {
  const { type, code, env } = props;

  const address = typeof props.address === 'string' ? props.address : props.address?.toBase58();

  if (!address) {
    return null;
  }

  const length = props.length ?? 9;
  const url = env == 'localnet' ? `https://explorer.solana.com/${type}/${address}?cluster=custom&customUrl=http://localhost:8899` : `https://explorer.solana.com/${type}/${address}?cluster=${env}`;
  return (
    <a
      href={url}
      // eslint-disable-next-line react/jsx-no-target-blank
      target="_blank"
      title={address}
      style={props.style}>
      {code ? (
        <Typography.Text style={props.style} code>
          {shortenAddress(address, length)}
        </Typography.Text>
      ) : (
        shortenAddress(address, length)
      )}
    </a>
  );
};
