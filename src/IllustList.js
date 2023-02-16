import './IllustList.css';
import { IllustContext } from './App';
import IllustNote from './IllustNote';
import { useContext } from 'react';

function IllistList() {
  const { notes, loading } = useContext(IllustContext);


  const rows = [];
  let row = [];

  if (!loading) {
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
  }
  
  return (
    <div id="IllustList">
      {loading ? <h2 className="NetworkStatus">Loading...</h2> : rows}
    </div>
  )
}

export default IllistList;