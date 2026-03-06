import { CONNECTION_CODE, CALLER_NAME, MOD_LABEL } from '../../constants/ui';

export default function CallHeader() {
  return (
    <div className="header-info">
      <div className="connection-text">{CONNECTION_CODE}</div>
      <div className="caller-name-wrapper">
        <div className="red-dot-icon">{MOD_LABEL}</div>
        <h1 className="caller-name">{CALLER_NAME}</h1>
      </div>
    </div>
  );
}
