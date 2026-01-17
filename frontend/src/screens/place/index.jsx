const PlaceScreen = ({
  handleToggleOrientation,
  orientation,
  handleAutoPlace,
  handleSubmitPlacement,
  isReadyToSubmit,
}) => {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Place Your Fleet</h2>
        <span className="turn-indicator">Step 3</span>
      </div>
      <p className="panel-subtitle">
        Place all ships, then submit your placement.
      </p>
      <div className="controls">
        <button type="button" onClick={handleToggleOrientation}>
          Orientation: {orientation === "H" ? "Horizontal" : "Vertical"}
        </button>
        <button type="button" onClick={handleAutoPlace}>
          Auto-place Fleet
        </button>
        <button
          type="button"
          onClick={handleSubmitPlacement}
          disabled={!isReadyToSubmit}
        >
          Submit Placement
        </button>
      </div>
    </section>
  );
};

export default PlaceScreen;
