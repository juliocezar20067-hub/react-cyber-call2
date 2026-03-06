import { INCOMING_STATUS_TEXT } from '../../constants/ui';

export default function IncomingStatus() {
  return (
    <div className="incoming-status">
      <span className="pulse-dot"></span>
      <span>{INCOMING_STATUS_TEXT}</span>
    </div>
  );
}
