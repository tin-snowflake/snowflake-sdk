import React, { useState } from 'react';
import { Avatar, Button, Card } from 'antd';
import { smartClick } from '../../utils/reactUtil';
import { Link } from 'react-router-dom';
import { TEMPLATE } from '../../utils/flowTemplateUtil';
import Meta from 'antd/es/card/Meta';
export function FlowTemplateItem(props) {
  const { templateId, title, icon, disabled } = props;

  return (
    <span className="flowTemplateItem">
      {disabled && (
        <Card>
          <Meta avatar={<img className="itemSelecIcon" src={'/icons/eco/' + icon + '.svg'} />} title={title} description={props.children} />
        </Card>
      )}

      {!disabled && (
        <Link key={templateId} to={'/editflow?template=' + templateId}>
          <Card className="templateCardEnabled">
            <Meta avatar={<img className="itemSelecIcon" src={'/icons/eco/' + icon + '.svg'} />} title={title} description={props.children} />
          </Card>
        </Link>
      )}
    </span>
  );
}
