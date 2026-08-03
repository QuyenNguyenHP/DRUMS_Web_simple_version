import { useEffect, useRef, useState } from "react";

const fieldClass =
  "w-full rounded-[12px] border border-[#334155] bg-[#0b1220] px-3 py-2 text-[12px] text-[#f8fafc] outline-none transition focus:border-[#2563eb]";
const labelClass = "mb-2 block text-[12px] font-semibold text-[#8fb4ef]";

const SelectField = ({ label, value, onChange, children, disabled = false }) => (
  <label className="block">
    <span className={labelClass}>{label}</span>
    <select
      className={fieldClass}
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      {children}
    </select>
  </label>
);

export const MultiSelectField = ({
  label,
  options,
  selectedValues,
  onToggle,
  isOpen,
  onOpenChange,
  getOptionValue,
  getOptionLabel,
  getOptionMeta,
  emptyMessage,
  placeholder,
  selectionMode = "multiple",
  disabled = false,
}) => {
  const containerRef = useRef(null);
  const selectedLabels = options
    .filter((option) => selectedValues.includes(getOptionValue(option)))
    .map((option) => getOptionLabel(option));
  const buttonLabel =
    selectionMode === "single"
      ? selectedLabels[0] ?? placeholder
      : selectedLabels.length > 0
        ? `${selectedLabels.length} item(s) selected`
        : placeholder;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div ref={containerRef} className="block">
      <span className={labelClass}>{label}</span>
      <div className="relative">
        <button
          type="button"
          className={`${fieldClass} flex cursor-pointer items-center justify-between gap-3 ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          onClick={() => {
            if (!disabled) {
              onOpenChange(!isOpen);
            }
          }}
          aria-expanded={isOpen}
          disabled={disabled}
        >
          <span className="truncate text-left">
            {buttonLabel}
          </span>
          <span className={`text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}>
            v
          </span>
        </button>

        {!disabled && isOpen ? (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-[12px] border border-[#334155] bg-[#0b1220] p-2 shadow-[0_16px_40px_rgba(2,6,23,0.45)]">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-[13px] text-slate-400">{emptyMessage}</div>
            ) : (
              options.map((option) => {
                const optionValue = getOptionValue(option);
                const optionMeta = getOptionMeta(option);

                return (
                  <label
                    key={optionValue}
                    className="flex cursor-pointer items-start gap-3 rounded-[10px] px-3 py-2 text-[#f8fafc] transition hover:bg-slate-800"
                  >
                    <input
                      type={selectionMode === "single" ? "radio" : "checkbox"}
                      className="mt-1 h-4 w-4 rounded border-slate-500 bg-transparent accent-blue-500"
                      checked={selectedValues.includes(optionValue)}
                      onChange={() => onToggle(optionValue)}
                      name={selectionMode === "single" ? `${label}-selection` : undefined}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] leading-5">
                        {getOptionLabel(option)}
                      </span>
                      {optionMeta ? (
                        <span className="block text-[11px] text-slate-400">{optionMeta}</span>
                      ) : null}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const VesselEngineSelector = ({
  vesselOptions,
  selectedVessel,
  onVesselChange,
  engineOptions,
  selectedEngineValues,
  onEngineSelectionChange,
  engineSelectionMode = "multiple",
  vesselDisabled = false,
  engineDisabled = false,
  className = "grid gap-3 lg:grid-cols-3",
}) => {
  const [selectedEngineValue = ""] = selectedEngineValues;
  const [isVesselOpen, setIsVesselOpen] = useState(false);
  const [isEngineOpen, setIsEngineOpen] = useState(false);

  const handleVesselToggle = (vesselValue) => {
    onVesselChange(vesselValue);
    setIsVesselOpen(false);
  };

  const handleEngineToggle = (engineKey) => {
    if (engineSelectionMode === "single-dropdown") {
      onEngineSelectionChange([engineKey]);
      setIsEngineOpen(false);
      return;
    }

    onEngineSelectionChange(
      selectedEngineValues.includes(engineKey)
        ? selectedEngineValues.filter((value) => value !== engineKey)
        : [...selectedEngineValues, engineKey]
    );
  };

  return (
    <div className={className}>
      <MultiSelectField
        label="Vessel"
        options={vesselOptions}
        selectedValues={selectedVessel ? [selectedVessel] : []}
        onToggle={handleVesselToggle}
        isOpen={isVesselOpen}
        onOpenChange={(nextIsOpen) => {
          setIsVesselOpen(nextIsOpen);
          if (nextIsOpen) {
            setIsEngineOpen(false);
          }
        }}
        getOptionValue={(option) => option.value}
        getOptionLabel={(option) => option.label}
        getOptionMeta={() => ""}
        placeholder="Select vessel"
        emptyMessage="No vessel configured."
        selectionMode="single"
        disabled={vesselDisabled}
      />

      {engineSelectionMode === "multiple" || engineSelectionMode === "single-dropdown" ? (
        <MultiSelectField
          label="Engine"
          options={engineOptions}
          selectedValues={selectedEngineValues}
          onToggle={handleEngineToggle}
          isOpen={isEngineOpen}
          onOpenChange={(nextIsOpen) => {
            setIsEngineOpen(nextIsOpen);
            if (nextIsOpen) {
              setIsVesselOpen(false);
            }
          }}
          getOptionValue={(option) => option.key}
          getOptionLabel={(option) => option.label}
          getOptionMeta={(option) => option.serialNo}
          placeholder="Select engine"
          emptyMessage="No engine configured."
          selectionMode={engineSelectionMode === "single-dropdown" ? "single" : "multiple"}
          disabled={engineDisabled}
        />
      ) : (
        <SelectField
          label="Engine"
          value={selectedEngineValue}
          onChange={(event) => onEngineSelectionChange([event.target.value])}
          disabled={engineDisabled}
        >
          {engineOptions.length === 0 ? <option value="">No engine configured</option> : null}
          {engineOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </SelectField>
      )}
    </div>
  );
};

export default VesselEngineSelector;
