import { CONNECTION_CODE, CALLER_NAME, MOD_LABEL } from '../../constants/ui';

export default function CallHeader({ connectionCode = CONNECTION_CODE, callerName = CALLER_NAME }) {
  return (
    <div className="header-info">
      <div className="connection-text">{connectionCode}</div>
      <div className="caller-name-wrapper">
        <div className="red-dot-icon">{MOD_LABEL}</div>
        <h1 className="caller-name">{callerName}</h1>
      </div>
    </div>
  );
}
