import './Subscribe.css'

function Subscribe({ email, setEmail, handleSubscribe }) {
  return (
    <section className="subscribe">
      <h2 className="subscribe-title">Subscribe</h2>
      <form className="subscribe-form" onSubmit={handleSubscribe}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="subscribe-input"
        />
        <button type="submit" className="subscribe-btn">SIGN UP</button>
      </form>
    </section>
  )
}

export default Subscribe
