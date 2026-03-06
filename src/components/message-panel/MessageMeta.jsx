import { MESSAGE_SENDER, MESSAGE_TIMESTAMP } from '../../constants/ui';

export default function MessageMeta({ type }) {
  if (type === 'timestamp') {
    return <div className="message-timestamp">{MESSAGE_TIMESTAMP}</div>;
  }

  return <div className="message-sender">{MESSAGE_SENDER}</div>;
}
