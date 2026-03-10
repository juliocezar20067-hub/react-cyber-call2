import { MESSAGE_SENDER, MESSAGE_TIMESTAMP } from '../../constants/ui';

export default function MessageMeta({ type, text }) {
  if (type === 'timestamp') {
    return <div className="message-timestamp">{text ?? MESSAGE_TIMESTAMP}</div>;
  }

  return <div className="message-sender">{text ?? MESSAGE_SENDER}</div>;
}
