import './AgeVerification.css';

function AgeVerification({ onVerified }) {
  const under18 = () => {
    window.location.href = 'https://snort.social/';
  };

  return (
    <div id="AgeVerification">
      <h2>年齢確認</h2>
      <p>
        本サイトはアダルトサイトではありませんが、<br/>
        表示される画像には過激な表現が含まれる場合があるため、未成年の利用を禁じています。<br/>
        あなたは18歳以上ですか？<br/>
        <button onClick={onVerified}>はい</button>
        <button onClick={under18}>いいえ</button>
      </p>
    </div>
  );
}

export default AgeVerification;