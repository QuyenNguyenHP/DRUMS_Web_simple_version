import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

const Header = ({ className = "" }) => {
  const [currentTime, setCurrentTime] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const updateCurrentTime = () => {
      setCurrentTime(formatter.format(new Date()).replace(",", " at"));
    };

    updateCurrentTime();
    const intervalId = window.setInterval(updateCurrentTime, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <header
      className={`flex h-[76px] items-center justify-between gap-4 border-b border-slate-700 bg-slate-800 px-4 ${className}`}
    >
      <button
        type="button"
        onClick={() => navigate("/")}
        className="flex items-center gap-3 rounded-xl bg-transparent p-0 text-left text-inherit transition-transform duration-300 hover:-translate-y-0.5"
      >
        <img
          src="/DRUMS_logo.png"
          alt="DRUMS"
          className="h-9 w-9 rounded-lg bg-slate-950 object-cover shadow-[0_6px_16px_rgba(0,0,0,0.28)]"
        />
        <span className="text-2xl font-bold tracking-[0.02em] text-slate-50 md:text-[28px]">
          ORMIN-ORMECO
        </span>
      </button>

      <div className="flex items-center gap-3">
        <div className="hidden min-w-72 rounded-lg border border-slate-600 bg-slate-700/70 px-4 py-2 md:block">
          <div className="text-center text-xs font-bold tracking-[0.06em] text-sky-300 whitespace-nowrap">
            {currentTime}
          </div>
        </div>

        <div className="h-7 w-7 rounded-full border border-slate-500 bg-slate-600" />
      </div>
    </header>
  );
};

Header.propTypes = {
  className: PropTypes.string,
};

export default Header;
