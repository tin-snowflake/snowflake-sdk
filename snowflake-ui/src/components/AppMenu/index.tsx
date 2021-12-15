import React, { useState } from 'react';
import { Button, Menu } from 'antd';
import { smartClick } from '../../utils/reactUtil';
import { AppstoreOutlined, BorderlessTableOutlined, ControlOutlined, FileTextOutlined, InfoCircleOutlined, MailOutlined, SettingOutlined } from '@ant-design/icons/lib';
import { MdOutlineBook } from 'react-icons/all';
export function AppMenu(props) {
  const [current, setCurrent] = useState('flows');

  const handleClick = e => {
    console.log('click ', e);
    setCurrent(e.key);
  };
  return (
    <Menu mode="horizontal" onClick={handleClick} selectedKeys={[current]}>
      <Menu.Item key="flows" icon={<BorderlessTableOutlined />}>
        <a href="/#">Your Automations</a>
      </Menu.Item>
      <Menu.Item key="global" icon={<BorderlessTableOutlined />}>
        <a href="/#/global">Global</a>
      </Menu.Item>
      <Menu.Item key="setting" icon={<SettingOutlined />}>
        <a href="/#/settings">Settings</a>
      </Menu.Item>
      <Menu.Item key="stats" disabled icon={<AppstoreOutlined />}>
        Stats
      </Menu.Item>
      <Menu.Item key="info" disabled icon={<InfoCircleOutlined />}>
        Info
      </Menu.Item>
    </Menu>
  );
}
