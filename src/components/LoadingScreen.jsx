export default function LoadingScreen({ fading = false }) {
  return (
    <div className={`l-screen${fading ? ' l-screen--out' : ''}`}>
      <div className="l-stage">
        <div className="l-wrap">
          <div className="l-halo" />
          <div className="l-ring" />
          <img className="l-logo" src="/cerebro-logo.png" alt="" />
        </div>
        <div className="l-text">SMGV</div>
        <div className="l-bar" />
      </div>
    </div>
  )
}
