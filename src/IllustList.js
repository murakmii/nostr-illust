import './IllustList.css';
import { IllustContext } from './App';
import IllustNote from './IllustNote';
import { useContext } from 'react';

function IllistList() {
  const { notes } = useContext(IllustContext);

  return (
    <div id="IllustList">
      {notes.map(n => <IllustNote key={n.id} note={n} />)}
    </div>
  )
}

export default IllistList;