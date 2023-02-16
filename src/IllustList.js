import './IllustList.css';
import { IllustContext } from './App';
import IllustNote from './IllustNote';
import { useContext } from 'react';

function IllistList() {
  const { notes, loading } = useContext(IllustContext);

  return (
    <div id="IllustList">
      {loading ? <h2 className="NetworkStatus">Loading...</h2> : notes.map(n => <IllustNote key={n.id} note={n} />)}
    </div>
  )
}

export default IllistList;