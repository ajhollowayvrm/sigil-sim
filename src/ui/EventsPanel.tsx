import { getCardInfo } from "../data/loadCards";
import type { Frame } from "../sim/recorder";

function Col({ events, label, onCard }: { events: string[]; label: string; onCard: (n: string) => void }) {
  return (
    <div className="epcol">
      <h4>{label}</h4>
      {events.length === 0 && <div className="epnone">none in play</div>}
      {events.map((e, i) => (
        <div className={`epitem${i === 0 ? " first" : ""}`} key={e}>
          <span className="epname" onClick={() => onCard(e)}>
            {e}
          </span>
          <div className="epeff">{getCardInfo(e)?.text ?? ""}</div>
        </div>
      ))}
    </div>
  );
}

export function EventsPanel({ frame, aName, bName, onCard }: { frame: Frame; aName: string; bName: string; onCard: (n: string) => void }) {
  return (
    <div className="eventspanel">
      <div className="ephead">Persistent events in play</div>
      <div className="epgrid">
        <Col events={frame.A.events} label={aName} onCard={onCard} />
        <Col events={frame.B.events} label={bName} onCard={onCard} />
      </div>
    </div>
  );
}
