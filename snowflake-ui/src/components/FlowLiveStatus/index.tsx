import React, { useState } from 'react';
import { Spin } from 'antd';
import { getStatus, STATUS } from '../../utils/flowUtil';
import { MdCircle } from 'react-icons/all';
import Countdown from 'antd/es/statistic/Countdown';
import { CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons/lib';
import Loader from 'react-loader-spinner';
export function FlowLiveStatus(props) {
  const { uiFlow, updateState } = props;

  return (
    <div className="statusText" style={{ textAlign: 'center', marginTop: '-10px', marginBottom: '10px' }}>
      {getStatus(uiFlow) == STATUS.COUNTDOWN && (
        <span>
          Time to next execution
          <br />
          <div className="iconAndText" style={{ justifyContent: 'center' }}>
            <MdCircle style={{ color: 'lightgreen' }}></MdCircle>
            <Countdown value={uiFlow.nextExecutionTime} format="HH:mm:ss:SSS" onFinish={updateState} />
          </div>
        </span>
      )}
      {getStatus(uiFlow) == STATUS.EXECUTING && (
        <span>
          <Spin size="large" /> <br /> Execution in progress.
        </span>
      )}
      {getStatus(uiFlow) == STATUS.NOT_SCHEDULED && (
        <span className="infoText">
          <ExclamationCircleOutlined /> Automation is currently not scheduled.
        </span>
      )}
      {getStatus(uiFlow) == STATUS.EXECUTED && (
        <span className="infoText">
          <CheckCircleOutlined /> Last executed at {uiFlow.lastExecutionTime.format('h:mm A, MMMM D, YYYY')}.
          <br /> No further executions pending.
        </span>
      )}
      {getStatus(uiFlow) == STATUS.UNKNOWN && (
        <span className="infoText">
          <InfoCircleOutlined /> Unknown Status.
        </span>
      )}
      {getStatus(uiFlow) == STATUS.MONITORING_EXECUTION && (
        <span>
          <Loader type="ThreeDots" color="#5ac4be" height={50} width={70} />
          Monitoring program for execution.
        </span>
      )}
    </div>
  );
}
