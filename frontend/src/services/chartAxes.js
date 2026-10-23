// Keep different units on independent scales, including unknown units.
export const groupSeriesByUnit = (series) => {
  const units = [...new Set(series.map((item) => String(item.unit ?? "").trim()))];
  return {
    series: series.map((item) => ({
      ...item,
      yAxisIndex: units.indexOf(String(item.unit ?? "").trim()),
    })),
    yAxes: units.map((unit, index) => ({
      name: unit || "No unit",
      position: index % 2 === 0 ? "left" : "right",
      offset: Math.floor(index / 2) * 72,
    })),
  };
};
