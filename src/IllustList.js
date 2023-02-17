import './IllustList.css';
import { IllustContext } from './App';
import IllustNote from './IllustNote';
import { useContext, useRef, useEffect } from 'react';

function IllistList() {
  const listRef = useRef(null);
  const { notes, loading, setUntil } = useContext(IllustContext);

  const rows = [];
  let row = [];

  notes.map(n => {
    row.push(<IllustNote key={n.id} note={n} />)
    if (row.length === 3) {
      rows.push(<div key={rows.length} className="Row">{row}</div>);
      row= [];
    }
  });

  if (row.length > 0) {
    rows.push(<div key={rows.length} className="Row">{row}</div>);
  }

  const loadNextIfNeeded = () => {
    const loadNext = (listRef.current.clientHeight + listRef.current.scrollTop) / listRef.current.scrollHeight > 0.8;
    if (!loading && loadNext && notes.length > 0) {
      setUntil(notes[notes.length - 1].createdAt); // -1するべき？
    }
  };

  useEffect(loadNextIfNeeded, [notes.length, loading]);

  return (
    <div id="IllustList" ref={listRef} onScroll={loadNextIfNeeded}>
      {rows}
    </div>
  )
}

export default IllistList;
