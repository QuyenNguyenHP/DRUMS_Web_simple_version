import { Box, Typography } from "@mui/material";
import PropTypes from "prop-types";

const formatLastUpdated = (lastUpdated) => {
  if (!lastUpdated) {
    return "Waiting for data...";
  }

  const timestamp =
    lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);

  if (Number.isNaN(timestamp.getTime())) {
    return "Waiting for data...";
  }

  return timestamp.toLocaleTimeString();
};

const formatPollInterval = (pollIntervalMs) => {
  if (!pollIntervalMs || pollIntervalMs <= 0) {
    return "";
  }

  const seconds = pollIntervalMs / 1000;
  const formattedSeconds =
    Number.isInteger(seconds) ? seconds : seconds.toFixed(1);

  return `every ${formattedSeconds}s`;
};

const Footer = ({ className = "", lastUpdated = null, pollIntervalMs = null }) => {
  const pollIntervalLabel = formatPollInterval(pollIntervalMs);

  return (
    <Box
      component="footer"
      className={className}
      sx={{
        minHeight: 32,
        px: 2,
        borderTop: "1px solid #364153",
        backgroundColor: "#1e2939",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <Typography sx={{ color: "#728195", fontSize: 11 }}>
          Copyright 2026 DRUMS HMI
        </Typography>
        <Typography sx={{ color: "#728195", fontSize: 11 }}>|</Typography>
        <Typography sx={{ color: "#728195", fontSize: 11 }}>
          Ver 4.2.1
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Typography sx={{ color: "#728195", fontSize: 11 }}>
          Last Update: {formatLastUpdated(lastUpdated)}
          {pollIntervalLabel ? ` | ${pollIntervalLabel}` : ""}
        </Typography>
      </Box>
    </Box>
  );
};

Footer.propTypes = {
  className: PropTypes.string,
  lastUpdated: PropTypes.oneOfType([
    PropTypes.instanceOf(Date),
    PropTypes.string,
  ]),
  pollIntervalMs: PropTypes.number,
};

export default Footer;
