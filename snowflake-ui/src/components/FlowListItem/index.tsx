import React from 'react';
import { Link } from 'react-router-dom';
import { Space } from 'antd';
import { MdCircle, MdOutlineBook, MdSchedule } from 'react-icons/all';
import * as snowUtil from '../../utils/snowUtils';
import moment from 'moment';
import { Flow, TriggerType } from '../../models/flow';

export const FlowListItem = ({ flowInfo }) => {
  const flow: Flow = flowInfo.account;

  function pendingExecution() {
    if (flow.triggerType === TriggerType.None) return false;
    else return flow.remainingRuns > 0;
  }

  return (
    <Link to={'/flowDetail/' + flowInfo.publicKey}>
      <div className="card">
        <div className="card-body flow-list-item" style={{ padding: '14px', paddingLeft: '34px' }}>
          <div className="item-icon">
            <MdOutlineBook />
          </div>

          <div className="item-meta" style={{ display: 'flex' }}>
            <h3 className="small-card-heading-text" style={{ width: '44%' }}>
              {flow.name}
            </h3>

            <Space size={70}>
              <div style={{ width: '150px' }}>
                <label>Trigger </label> &nbsp;&nbsp;
                <div className="iconAndText">
                  <MdSchedule />
                  Time
                </div>
              </div>

              <div style={{ width: '250px' }}>
                <label>Next Execution</label> &nbsp;&nbsp;
                <div className="iconAndText">
                  <MdCircle style={{ color: pendingExecution() ? 'lightgreen' : 'grey' }}></MdCircle>
                  {pendingExecution() ? (flow.triggerType === TriggerType.Time ? snowUtil.formatUnixTimeStamp(flow.nextExecutionTime) : 'Awaiting Condition') : 'None'}
                </div>
              </div>
            </Space>
          </div>
        </div>
      </div>
    </Link>
  );
};
