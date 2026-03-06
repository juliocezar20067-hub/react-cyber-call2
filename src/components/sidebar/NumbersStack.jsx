import { SIDEBAR_NUMBERS } from '../../constants/ui';

export default function NumbersStack() {
  return (
    <div className="numbers-stack">
      {SIDEBAR_NUMBERS.map((number, index) => (
        <span key={number}>
          {number}
          {index < SIDEBAR_NUMBERS.length - 1 ? <br /> : null}
        </span>
      ))}
    </div>
  );
}
