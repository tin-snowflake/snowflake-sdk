import React from 'react';
import { Link } from 'react-router-dom';
import { Space } from 'antd';
import { MdCircle, MdOutlineBook } from 'react-icons/all';
import * as snowUtil from '../../utils/snowUtils';

export const FlowListItem = ({ name, flowKey, schedule, actions }) => {
  return (
    <Link to={'/flowDetail/' + flowKey}>
      <div className="card">
        <div className="card-body flow-list-item" style={{ padding: '14px', paddingLeft: '34px' }}>
          <div className="item-icon">
            <MdOutlineBook />
          </div>

          <div className="item-meta" style={{ display: 'flex' }}>
            <h3 className="small-card-heading-text" style={{ width: '34%' }}>
              {name}
            </h3>

            <Space size={70}>
              <div style={{ width: '250px' }}>
                <label>Trigger</label> &nbsp;&nbsp;
                <div>{isNaN(+schedule) ? schedule : snowUtil.formatUnixTimeStamp(schedule / 1000)}</div>
              </div>

              <div>
                <label>Actions </label> &nbsp;&nbsp;
                <div>{actions}</div>
              </div>

              <div>
                <label>Status </label> &nbsp;&nbsp;
                <div className="iconAndText">
                  <MdCircle style={{ color: 'lightgreen' }}></MdCircle>live
                </div>
              </div>
            </Space>
          </div>
        </div>
      </div>
    </Link>
  );
};
