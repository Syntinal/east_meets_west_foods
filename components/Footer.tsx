import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-slim">
        <p className="footer-slim-top">
          East Meets West LLC &nbsp;&middot;&nbsp; 476534 US HWY 95, Suite B, Ponderay, ID 83852 &nbsp;&middot;&nbsp;{" "}
          <a className="footer-tel" href="tel:+12086276283">(208)&nbsp;627-6283</a>
        </p>
        <div className="footer-slim-bottom">
          <span>&copy; East Meets West LLC</span>
          <nav className="footer-slim-nav" aria-label="Footer">
            <Link href="/menu">Menu</Link>
            <Link href="/sauce">Sauce</Link>
            <Link href="/story">Story</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
