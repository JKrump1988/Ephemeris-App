import { act } from "react";

import { BirthChartEditor } from "./BirthChartEditor";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  click,
  getByTestId,
  INVALID_BIRTH_TIMES,
  mount,
  setInputValue,
  VALID_BIRTH_TIMES,
} from "@/testUtils/birthTimeForm";

jest.mock("@/lib/api", () => ({
  api: { get: jest.fn(), put: jest.fn() },
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("lucide-react", () => ({
  MapPin: () => null,
  PencilLine: () => null,
  RefreshCw: () => null,
  Search: () => null,
}));

const CHART = {
  id: "saved-chart",
  birth_date: "2000-02-12",
  birth_time: "07:20:27.123456",
  location_name: "London, United Kingdom",
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: "Europe/London",
  approximate_time_used: false,
};

const NEW_LOCATION = {
  id: "tokyo",
  label: "Tokyo, Japan",
  latitude: 35.6762,
  longitude: 139.6503,
  timezone: "Asia/Tokyo",
};

const EXPECTED_PAYLOAD = {
  birth_date: CHART.birth_date,
  birth_time: CHART.birth_time,
  birth_time_known: true,
  location_name: CHART.location_name,
  latitude: CHART.latitude,
  longitude: CHART.longitude,
  timezone: CHART.timezone,
};

describe("BirthChartEditor exact birth time", () => {
  let view;
  let onUpdated;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    onUpdated = jest.fn();
    api.get.mockResolvedValue({ data: { results: [NEW_LOCATION] } });
    api.put.mockResolvedValue({ data: CHART });
  });

  afterEach(async () => {
    if (view) await view.unmount();
    view = undefined;
  });

  const field = (id) => getByTestId(view.container, id);
  const timeInput = () => field("editor-birth-time-input");
  const save = () => click(field("editor-regenerate-chart-button"));

  async function openEditor(chart = CHART) {
    view = await mount(<BirthChartEditor chart={chart} onUpdated={onUpdated} />);
    await click(field("birth-chart-editor-toggle-button"));
  }

  it.each(VALID_BIRTH_TIMES)("shows and submits an untouched saved time %s unchanged", async (birthTime) => {
    const chart = { ...CHART, birth_time: birthTime };
    api.put.mockResolvedValueOnce({ data: chart });
    await openEditor(chart);
    expect(timeInput().value).toBe(birthTime);

    await save();

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith("/chart/current", {
      ...EXPECTED_PAYLOAD,
      birth_time: birthTime,
    });
    expect(onUpdated).toHaveBeenCalledWith(chart);
  });

  it("preserves the full time when only the date changes", async () => {
    await openEditor();
    await setInputValue(field("editor-birth-date-input"), "2001-02-12");
    expect(timeInput().value).toBe(CHART.birth_time);

    await save();

    expect(api.put).toHaveBeenCalledWith("/chart/current", {
      ...EXPECTED_PAYLOAD,
      birth_date: "2001-02-12",
    });
  });

  it("preserves the full time when only the location changes", async () => {
    await openEditor();
    await setInputValue(field("editor-location-query-input"), "Tokyo");
    await click(field("editor-location-search-button"));
    await click(field("editor-location-option-tokyo"));
    expect(timeInput().value).toBe(CHART.birth_time);

    await save();

    expect(api.get).toHaveBeenCalledWith("/locations/search", { params: { q: "Tokyo" } });
    expect(api.put).toHaveBeenCalledWith("/chart/current", {
      ...EXPECTED_PAYLOAD,
      location_name: NEW_LOCATION.label,
      latitude: NEW_LOCATION.latitude,
      longitude: NEW_LOCATION.longitude,
      timezone: NEW_LOCATION.timezone,
    });
  });

  it.each(VALID_BIRTH_TIMES)("submits an edited time %s without normalization", async (birthTime) => {
    await openEditor({ ...CHART, birth_time: "05:10" });
    await setInputValue(timeInput(), birthTime);
    expect(timeInput().value).toBe(birthTime);

    await save();

    expect(api.put).toHaveBeenCalledWith("/chart/current", {
      ...EXPECTED_PAYLOAD,
      birth_time: birthTime,
    });
    expect(onUpdated).toHaveBeenCalledTimes(1);
  });

  it.each(INVALID_BIRTH_TIMES)("rejects invalid or blank time %j before making a request", async (birthTime) => {
    await openEditor();
    await setInputValue(timeInput(), birthTime);

    await save();

    expect(api.put).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", { ...CHART, birth_time: null }, "00:00"],
    ["approximate", { ...CHART, birth_time: "12:00", approximate_time_used: true }, "12:00"],
  ])("requires an explicit time for a legacy %s chart", async (_label, chart, enteredTime) => {
    await openEditor(chart);
    expect(timeInput().value).toBe("");
    expect(timeInput().disabled).toBe(false);

    await save();
    expect(api.put).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();

    await setInputValue(timeInput(), enteredTime);
    await save();

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith("/chart/current", {
      ...EXPECTED_PAYLOAD,
      birth_time: enteredTime,
    });
    expect(onUpdated).toHaveBeenCalledTimes(1);
  });

  it("offers no unknown-time toggle or promise to substitute noon", async () => {
    await openEditor();
    expect(view.container.querySelector('[data-testid="editor-unknown-birth-time-toggle"]')).toBeNull();
    expect(view.container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(view.container.textContent).not.toMatch(/use(?:s)? 12:00 UT/i);
  });

  it("retains precision after a successful save, chart refresh, and reopening", async () => {
    await openEditor();
    await save();
    expect(view.container.querySelector('[data-testid="editor-birth-time-input"]')).toBeNull();

    await view.rerender(<BirthChartEditor chart={{ ...CHART }} onUpdated={onUpdated} />);
    await click(field("birth-chart-editor-toggle-button"));
    expect(timeInput().value).toBe(CHART.birth_time);
    await save();

    expect(api.put).toHaveBeenCalledTimes(2);
    expect(api.put).toHaveBeenLastCalledWith("/chart/current", EXPECTED_PAYLOAD);
  });

  it("calls onUpdated only after the API succeeds", async () => {
    let resolveRequest;
    api.put.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
    await openEditor();
    await save();

    expect(onUpdated).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(field("editor-regenerate-chart-button").disabled).toBe(true);

    await act(async () => resolveRequest({ data: CHART }));

    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(onUpdated).toHaveBeenCalledWith(CHART);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("keeps the exact value editable after an API failure without claiming success", async () => {
    api.put.mockRejectedValue({ response: { data: { detail: "Calculation unavailable" } } });
    await openEditor();
    await save();

    expect(onUpdated).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Calculation unavailable");
    expect(timeInput().value).toBe(CHART.birth_time);
    expect(field("editor-regenerate-chart-button").disabled).toBe(false);
  });
});
