import './About.css';

function About() {
  return (
    <div id="About">
      <h2>#about</h2>
      <p>
        このページは、
        <a href="https://snort.social/p/npub1rpqr4ygerl4357lsn02c8cm8qq4tv55tapnmmnslld37prkcprzs0flhga" target="_blank" rel="noreferrer">@murakmii</a>
        がNostr上の#illustタグ付きノートを見やすくために作ったページです。<br/>
        利用する方は自己責任でお願いします。ページを利用することで発生したいかなる損害に対しても、@murakmiiは責任を負いません。<br/><br/>
        以下のリレーからノートを取得しています。

      </p>
      <ul>
        <li>relay.damus.io</li>
        <li>relay.snort.social</li>
      </ul>
    </div>
  )
}

export default About;