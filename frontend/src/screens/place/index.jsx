const PlaceScreen = ({
  handleToggleOrientation,
  orientation,
  handleAutoPlace,
  handleSubmitPlacement,
  isReadyToSubmit,
  placement,
  getCellKey,
  handleManualPlacement,
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
      <div className="board">
        {placement.board.map((row, rowIndex) => (
          <div className="row" key={`player-row-${rowIndex}`}>
            {row.map((cell, colIndex) => (
              <button
                key={`player-${getCellKey(rowIndex, colIndex)}`}
                type="button"
                className={`cell ${cell.shipId !== null ? "ship" : "empty"}`}
                onClick={() => handleManualPlacement(rowIndex, colIndex)}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};

export default PlaceScreen;
