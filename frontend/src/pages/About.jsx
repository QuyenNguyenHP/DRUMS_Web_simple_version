import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import "./About.css";

const benefits = [
  ["01", "Centralised data", "Bring vessel measurements together in a central platform for a clearer view of operations."],
  ["02", "Remote monitoring", "Access vessel information ashore, with near real-time monitoring through connected dashboards."],
  ["03", "Smart analytics", "Use machine learning and anomaly detection to support predictive maintenance."],
  ["04", "Informed decisions", "Turn operational data into actionable insights that support efficiency and maintenance planning."],
];
const features = ["Homepage console", "Dashboards", "Alarms", "Exhaust monitoring", "Anomaly detection", "AI chatbot", "Monthly reports", "Maintenance records"];
const albumPhotos = [
  ["A close view of DRUMS CPU.jpg", "DRUMS CPU", "A close view of the DRUMS onboard processing unit."],
  ["Bunkering operations on Dubai Sky.jpg", "Dubai Sky bunkering operation", "Bunkering operations aboard Dubai Sky."],
  ["Carrying out DRUMS commissioning for DB45-02 Vietnam.jpg", "DB45-02 commissioning", "Commissioning the DRUMS system aboard DB45-02 in Vietnam."],
  ["Configure data channel.jpg", "Data channel configuration", "Configuring data channels for the DRUMS monitoring system."],
  ["DB6601.jpg", "DB6601", "DRUMS installation aboard DB6601."],
  ["DB6602.jpg", "DB6602", "DRUMS installation aboard DB6602."],
  ["Doing DRUMS Commissioning.jpg", "DRUMS commissioning", "Onboard commissioning and system verification in progress."],
  ["DRUMS Box.jpg", "DRUMS Ready for Delivery", "DRUMS Ready for Delivery after packaging and testing."],
  ["DRUMS Commisioning Comletetion.jpg", "Commissioning completed", "The DRUMS team after completing onboard commissioning."],
  ["DRUMS DB6602 Commissioning 2.jpg", "DB6602 commissioning", "Commissioning and verification aboard DB6602."],
  ["DRUMS EAD H429.jpg", "EAD H429", "DRUMS equipment installed aboard H429."],
  ["DRUMS EAD Model installed under the engine control and alarm system console in ECR.jpg", "EAD installation in ECR", "The DRUMS EAD module installed below the engine control and alarm console."],
  ["DRUMS in ECR.jpg", "DRUMS in the engine control room", "The DRUMS system operating in the vessel ECR."],
  ["DRUMS Operation.jpg", "DRUMS operation", "Monitoring vessel information through DRUMS."],
  ["DRUMS Presentation in IT Dept Room.jpg", "DRUMS presentation", "Presenting the DRUMS platform in the IT department room."],
  ["DRUMS QC Inspection.jpg", "Quality inspection", "Quality control inspection before deployment."],
  ["DRUMS Testing.jpg", "System testing", "Testing the DRUMS system and connected equipment."],
  ["DRUMS_EDA_DB6602.jpg", "EDA DB6602", "DRUMS equipment and data acquisition aboard DB6602."],
  ["Dubai Eco.jpg", "Dubai Eco", "DRUMS deployment aboard Dubai Eco."],
  ["Dubai Nature.jpg", "Dubai Nature", "DRUMS deployment aboard Dubai Nature."],
  ["Dubai World Vessel (2).jpg", "Dubai World vessel", "A second onboard view of Dubai World."],
  ["Dubai World Vessel.jpg", "Dubai World onboard", "An onboard view of Dubai World."],
  ["Dubai World.jpg", "Dubai World", "DRUMS deployment aboard Dubai World."],
  ["ECU.jpg", "Engine control unit", "Equipment integrated with the DRUMS data collection system."],
  ["Marine Queenie.jpg", "Marine Queenie", "DRUMS deployment aboard Marine Queenie."],
  ["Shanaya Ferry - DRUMS Commissioning - Batam Indonesia.jpg", "Shanaya Ferry commissioning", "Commissioning DRUMS aboard Shanaya Ferry in Batam, Indonesia."],
  ["Using a rope ladder to climb from the boat onto the vessel..jpg", "Boarding the vessel", "The service team boarding the vessel by rope ladder."],
  ["View of the Singapore anchorage at dawn.jpg", "Singapore anchorage at dawn", "A dawn view across the Singapore anchorage during field operations."],
].map(([file, title, description]) => ({
  file,
  title,
  description,
  src: `/DRUMS%20Album/${encodeURIComponent(file)}`,
}));

export default function About({ user, onLogout }) {
  const page = useRef(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [isAlbumPlaying, setIsAlbumPlaying] = useState(true);

  const showPreviousPhoto = () => {
    setActivePhoto((current) => (current - 1 + albumPhotos.length) % albumPhotos.length);
  };

  const showNextPhoto = () => {
    setActivePhoto((current) => (current + 1) % albumPhotos.length);
  };

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!isAlbumPlaying || reducedMotion.matches) return undefined;
    const interval = window.setInterval(showNextPhoto, 5000);
    return () => window.clearInterval(interval);
  }, [isAlbumPlaying]);

  useEffect(() => {
    const elements = page.current.querySelectorAll("[data-reveal]");
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("reveal-pending");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    elements.forEach((element) => {
      element.classList.add("reveal-pending");
      observer.observe(element);
    });
    const revealAll = () => {
      if (preference.matches) {
        elements.forEach((element) => element.classList.remove("reveal-pending"));
        observer.disconnect();
      }
    };
    preference.addEventListener("change", revealAll);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", revealAll);
      elements.forEach((element) => element.classList.remove("reveal-pending"));
    };
  }, []);

  return (
    <div className="about-shell">
      <Header user={user} onLogout={onLogout} />
      <div className="about-layout">
        <NavigationSidebar className="w-full min-w-0 lg:w-56 lg:min-w-56" />
        <main className="about-page" ref={page} id="about-top">
          <section className="about-hero" aria-labelledby="about-title">
            <img className="about-hero-image" src="/about/hero.jpg" alt="Container vessel sailing across blue ocean water" fetchPriority="high" />
            <div className="about-hero-content">
              <p className="about-eyebrow">Daikai Engineering Pte Ltd</p>
              <h1 id="about-title">Vessel data.<br /><span>Clearer decisions.</span></h1>
              <p className="about-hero-description">Meet DRUMS. A data collection and remote monitoring system that connects vessel operations with actionable insights.</p>
              <a className="about-button" href="#about-overview">Discover DRUMS <span aria-hidden="true">↓</span></a>
            </div>
            <div className="about-hero-caption">DRUMS / DATA COLLECTION & MONITORING</div>
          </section>

          <nav className="about-chapters" aria-label="About page sections">
            <a href="#about-overview">Overview</a><a href="#about-system">How it works</a><a href="#about-features">Features</a><a href="#about-gallery">Gallery</a><a href="#about-security">Security</a><a href="#about-records">Supply records</a>
          </nav>

          <section className="about-section" id="about-overview">
            <div className="about-intro" data-reveal>
              <p className="about-eyebrow">01 / What is DRUMS?</p>
              <h2>A connected view of vessel operations</h2>
              <p>DRUMS brings data collection, monitoring, machine learning and dashboards together. It helps teams understand equipment performance and use that information to make operational decisions.</p>
            </div>
            <div className="about-benefits">
              {benefits.map(([number, title, description]) => <article key={number} data-reveal><span className="about-number">{number}</span><h3>{title}</h3><p>{description}</p></article>)}
            </div>
          </section>

          <section className="about-section about-system" id="about-system">
            <div className="about-intro" data-reveal><p className="about-eyebrow">02 / How it works</p><h2>Onboard measurements.<br />Connected intelligence.</h2><p>DRUMS collects data from sensors and Daihatsu DECSS through interfaces including MODBUS, serial connections and individual wiring.</p></div>
            <ol className="about-flow" data-reveal>
              <li><div className="about-flow-image"><img src="/about/decss-controller.png" alt="Daihatsu DECSS onboard controller" loading="lazy" /></div><span>01</span><h3>Collect</h3><p>Sensor data is collected every 2 seconds and stored in CSV format.</p></li>
              <li><div className="about-flow-image"><img src="/about/data-collector.jpg" alt="DRUMS onboard data collection cabinet" loading="lazy" /></div><span>02</span><h3>Transmit</h3><p>Data is compressed and encrypted for transmission every 3 minutes.</p></li>
              <li><div className="about-flow-image"><img src="/about/remote-monitoring.jpg" alt="Remote monitoring dashboard on a laptop" loading="lazy" /></div><span>03</span><h3>Understand</h3><p>A central server supports remote dashboards, analysis and monitoring.</p></li>
            </ol>
            <div className="about-connectivity" data-reveal><h3>Connectivity that fits the vessel</h3><p>Vessel internet · RJ45 / Ethernet · Wi-Fi · Cellular network</p><div className="about-connectivity-visuals">
                <figure className="about-cabinet">
                  <img src="/about/connectivity-cabinet.jpg" alt="DRUMS cabinet with network equipment and wiring" loading="lazy" />
                  <figcaption>Onboard installation</figcaption>
                </figure>
                <div className="about-connection-options">
                  {[
                    ["wifi-router.png", "Wi-Fi router", "Wireless connection"],
                    ["ethernet-router.png", "Ethernet network equipment", "RJ45 / Ethernet"],
                    ["cellular-dongle.png", "Cellular dongle", "Cellular network"],
                  ].map(([image, alt, label]) => (
                    <figure key={image}>
                      <div className="about-connection-image"><img src={`/about/${image}`} alt={alt} loading="lazy" /></div>
                      <figcaption>{label}</figcaption>
                    </figure>
                  ))}
                </div>
              </div><p className="about-note">Deployment requires stable connectivity and an initial installation investment.</p></div>
            <details className="about-architecture" data-reveal><summary>Explore the DRUMS system architecture</summary><figure><a href="/about/architecture.png" target="_blank" rel="noreferrer"><img src="/about/architecture.png" alt="DRUMS architecture: sensors feed CSV storage, compression and encryption, then internet transmission to central storage, anomaly detection, a web server and dashboards, with authentication, access control and backup." loading="lazy" width="1920" height="1080" /></a><figcaption>Architecture from the supplied DRUMS presentation. Select the diagram to view it at full size.</figcaption></figure></details>
          </section>

          <section className="about-section" id="about-features">
            <div className="about-intro" data-reveal><p className="about-eyebrow">03 / Core features</p><h2>Tools for everyday operational insight</h2><p>The DRUMS platform presented by Daikai combines monitoring tools with reporting and maintenance information.</p></div>
            <div className="about-features">{features.map((feature, index) => <div data-reveal key={feature}><span>{String(index + 1).padStart(2, "0")}</span><h3>{feature}</h3></div>)}</div>
          </section>

          <section className="about-section about-gallery-section" id="about-gallery">
            <div className="about-intro" data-reveal>
              <p className="about-eyebrow">04 / DRUMS album</p>
              <h2>DRUMS onboard and in operation</h2>
              <p>Installation, commissioning and operational moments from vessels equipped with DRUMS.</p>
            </div>
            <div
              className="about-gallery"
              data-reveal
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") showPreviousPhoto();
                if (event.key === "ArrowRight") showNextPhoto();
              }}
              aria-label="DRUMS photo slideshow. Use the left and right arrow keys to change photos."
            >
              <div className="about-gallery-stage">
                <img
                  key={albumPhotos[activePhoto].file}
                  src={albumPhotos[activePhoto].src}
                  alt={albumPhotos[activePhoto].description}
                  className="about-gallery-image"
                  loading="lazy"
                  decoding="async"
                />
                <div className="about-gallery-shade" />
                <div className="about-gallery-caption" aria-live="polite">
                  <span>{String(activePhoto + 1).padStart(2, "0")} / {String(albumPhotos.length).padStart(2, "0")}</span>
                  <h3>{albumPhotos[activePhoto].title}</h3>
                  <p>{albumPhotos[activePhoto].description}</p>
                </div>
                <div className="about-gallery-controls">
                  <button type="button" onClick={showPreviousPhoto} aria-label="Previous photo">←</button>
                  <button
                    type="button"
                    onClick={() => setIsAlbumPlaying((playing) => !playing)}
                    aria-label={isAlbumPlaying ? "Pause slideshow" : "Play slideshow"}
                  >
                    {isAlbumPlaying ? "Pause" : "Play"}
                  </button>
                  <button type="button" onClick={showNextPhoto} aria-label="Next photo">→</button>
                </div>
              </div>
              <div className="about-gallery-thumbnails" aria-label="Choose a photo">
                {albumPhotos.map((photo, index) => (
                  <button
                    type="button"
                    className={index === activePhoto ? "is-active" : ""}
                    key={photo.file}
                    onClick={() => setActivePhoto(index)}
                    aria-label={`Show ${photo.title}`}
                    aria-current={index === activePhoto ? "true" : undefined}
                  >
                    <img src={photo.src} alt="" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="about-section about-security" id="about-security">
            <div className="about-intro" data-reveal><p className="about-eyebrow">05 / Data security</p><h2>Protection throughout the data journey</h2><p>DRUMS uses multiple layers of protection, from vessel data transmission to access and monitoring on the central platform.</p></div>
            <ul data-reveal>{["Secure, encrypted data transmission", "Authentication and role-based access control", "Vessel-level data protection", "Audit and monitoring", "Backup and system protection"].map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
          </section>

          <section className="about-section" id="about-records">
            <div className="about-intro" data-reveal><p className="about-eyebrow">06 / Supply records</p><h2>DRUMS across fleets</h2><p>Vessel supply records listed in the March 2026 presentation.</p></div>
            <div className="about-records" data-reveal>{[["Emarat", 6, "emarat-logo.png"], ["Jemla", 1, "jemla-logo.png"], ["Vitol", 4, "vitol-logo.png"], ["Truongminh", 4, "truongminh-logo.png"]].map(([name, count, logo]) => <article key={name}><div className="about-fleet-logo"><img src={`/about/${logo}`} alt={`${name} logo`} loading="lazy" /></div><strong>{count}</strong><h3>{name}</h3><p>{count === 1 ? "vessel" : "vessels"}</p></article>)}</div>
            <div className="about-closing" data-reveal><div><p className="about-eyebrow">Explore your data</p><h2>Your engine data awaits</h2></div><Link className="about-button" to="/engine">Open Engine Page <span aria-hidden="true">↗</span></Link></div>
          </section>
          <footer className="about-footer"><span>DRUMS · Daikai Engineering Pte Ltd<br />Based on DRUMS presentation V7 · 3 March 2026</span><a href="#about-top">Back to top ↑</a></footer>
        </main>
      </div>
    </div>
  );
}
