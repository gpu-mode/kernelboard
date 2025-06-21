import "../styles/Home.css";
import Header from "../components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <div className="home-container">
        <div className="hero-section">
          <h1>Welcome to Kernelboard</h1>
          <p>
            Your friendly source for information about GPU kernels submitted to
            the Discord cluster manager
          </p>
          <div className="cta-buttons">
            <a href="/kb/about" className="primary-button">
              Learn More
            </a>
          </div>
        </div>

        <div className="features-section">
          <h2>Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>GPU Kernel Information</h3>
              <p>
                Access detailed information about GPU kernels submitted to the
                Discord cluster manager.
              </p>
            </div>
            <div className="feature-card">
              <h3>Helpful Resources</h3>
              <p>
                Find links and resources related to GPU MODE and kernel
                development.
              </p>
            </div>
            <div className="feature-card">
              <h3>Performance Metrics</h3>
              <p>
                View performance metrics and statistics for your GPU kernels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
