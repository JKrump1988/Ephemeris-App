import { act } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import OnboardingPage from "./OnboardingPage";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  click,
  getByTestId,
  INVALID_BIRTH_TIMES,
  mount,
  setInputValue,
  VALID_BIRTH_TIMES,
} from "@/testUtils/birthTimeForm";

jest.mock("@/lib/api", () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));
jest.mock("@/context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: jest.fn() }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("lucide-react", () => ({ MapPin: () => null, Search: () => null }));

const LOCATION = {
  id: "london",
  label: "London, United Kingdom",
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: "Europe/London",
};

describe("OnboardingPage exact birth time", () => {
  let view;
  let navigate;
  let markHasChart;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    navigate = jest.fn();
    markHasChart = jest.fn();
    useNavigate.mockReturnValue(navigate);
    useAuth.mockReturnValue({ markHasChart });
    api.get.mockResolvedValue({ data: { results: [LOCATION] } });
    api.post.mockResolvedValue({ data: { id: "new-chart" } });
  });

  afterEach(async () => {
    if (view) await view.unmount();
    view = undefined;
  });

  const field = (id) => getByTestId(view.container, id);
  const timeInput = () => field("birth-time-input");
  const save = () => click(field("calculate-chart-button"));

  async function fillDateAndLocation() {
    await setInputValue(field("birth-date-input"), "2000-02-12");
    await setInputValue(field("location-query-input"), "London");
    await click(field("location-search-button"));
    await click(field("location-option-london"));
  }

  async function openOnboarding() {
    view = await mount(<OnboardingPage />);
  }

  it("starts with no time and does not invent noon when other fields are complete", async () => {
    await openOnboarding();
    expect(timeInput().value).toBe("");
    await fillDateAndLocation();

    await save();

    expect(api.post).not.toHaveBeenCalled();
    expect(markHasChart).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("offers no unknown-time toggle or promise to substitute noon", async () => {
    await openOnboarding();
    expect(view.container.querySelector('[data-testid="unknown-birth-time-toggle"]')).toBeNull();
    expect(view.container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(view.container.textContent).not.toMatch(/use(?:s)? 12:00 UT/i);
  });

  it.each(VALID_BIRTH_TIMES)("shows and submits %s without normalization", async (birthTime) => {
    await openOnboarding();
    await fillDateAndLocation();
    await setInputValue(timeInput(), birthTime);
    expect(timeInput().value).toBe(birthTime);

    await save();

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith("/chart", {
      birth_date: "2000-02-12",
      birth_time: birthTime,
      birth_time_known: true,
      location_name: LOCATION.label,
      latitude: LOCATION.latitude,
      longitude: LOCATION.longitude,
      timezone: LOCATION.timezone,
    });
    expect(markHasChart).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it.each(INVALID_BIRTH_TIMES)("rejects invalid or blank time %j before making a request", async (birthTime) => {
    await openOnboarding();
    await fillDateAndLocation();
    await setInputValue(timeInput(), birthTime);

    await save();

    expect(api.post).not.toHaveBeenCalled();
    expect(markHasChart).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("marks the chart and navigates only after the API succeeds", async () => {
    let resolveRequest;
    api.post.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
    await openOnboarding();
    await fillDateAndLocation();
    await setInputValue(timeInput(), "07:20:27.123456");
    await save();

    expect(markHasChart).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(field("calculate-chart-button").disabled).toBe(true);

    await act(async () => resolveRequest({ data: { id: "new-chart" } }));

    expect(markHasChart).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("retains the entered time after an API failure without navigating or claiming success", async () => {
    api.post.mockRejectedValue({ response: { data: { detail: "Calculation unavailable" } } });
    await openOnboarding();
    await fillDateAndLocation();
    await setInputValue(timeInput(), "07:20:27.123456");

    await save();

    expect(markHasChart).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Calculation unavailable");
    expect(timeInput().value).toBe("07:20:27.123456");
    expect(field("calculate-chart-button").disabled).toBe(false);
  });
});
