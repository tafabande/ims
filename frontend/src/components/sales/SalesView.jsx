import React from 'react';
import SalesGovernanceView from './SalesGovernanceView';
import POSTerminalView from '../pos/POSTerminalView';
import { can } from '../../utils/permissions';

export default function SalesView(props) {
  const { currentRole = 'STAFF' } = props;
  const isManager = can(currentRole, 'sales.policy') || can(currentRole, 'attention.decide');

  if (isManager) {
    return <SalesGovernanceView {...props} />;
  }

  return <POSTerminalView {...props} />;
}

export { SalesGovernanceView, POSTerminalView };
