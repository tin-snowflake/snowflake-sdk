import React, { useState } from 'react';
import { Button } from 'antd';
import { smartClick } from '../../utils/reactUtil';
export function SensitiveButton(props) {
  const [loading, setLoading] = useState(false);
  const newProps = { ...props };
  newProps.loading = loading;
  newProps.onClick = () => {
    setLoading(true);
    smartClick(props.onClick).finally(() => {
      setLoading(false);
    });
    // props.onClick().finally(() => {
    //   setLoading(false);
    // });
  };
  return <Button {...newProps}>{newProps.children}</Button>;
}
