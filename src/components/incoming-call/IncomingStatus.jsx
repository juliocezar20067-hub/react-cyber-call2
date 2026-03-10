import { INCOMING_STATUS_TEXT } from '../../constants/ui';

export default function IncomingStatus({ statusText = INCOMING_STATUS_TEXT }) {
  return (
    <div className="incoming-status">
      <span className="pulse-dot"></span>
      <span>{statusText}</span>
    </div>
  );
}
