import { Link } from "react-router-dom";
import "../styles/Header.css";

export default function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo-container">
          <h1>Kernelboard</h1>
        </div>
        <nav className="navigation">
          <ul>
            <li>
              <Link to="/" className="nav-link">
                Home
              </Link>
            </li>
            <li>
              <Link to="/about" className="nav-link active">
                About
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
