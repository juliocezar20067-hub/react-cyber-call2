import NumbersStack from './sidebar/NumbersStack';
import PhoneIcon from './sidebar/PhoneIcon';
import './Sidebar.css';

export default function Sidebar() {
  return (
    <div className="sidebar">
      <NumbersStack />
      <PhoneIcon />
    </div>
  );
}
