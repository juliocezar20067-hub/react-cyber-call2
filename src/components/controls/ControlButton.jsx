export default function ControlButton({ children, onClick, style }) {
  return (
    <button className="cp-button" onClick={onClick} style={style}>
      {children}
    </button>
  );
}
