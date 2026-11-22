import { act } from "react";
import { createRoot } from "react-dom/client";

export const VALID_BIRTH_TIMES = [
  "07:20",
  "07:20:00",
  "07:20:00.000001",
  "07:20:27",
  "07:20:27.1",
  "07:20:27.12",
  "07:20:27.123",
  "07:20:27.1234",
  "07:20:27.12345",
  "07:20:27.123456",
  "12:00",
  "00:00",
  "23:59:59.999999",
];

export const INVALID_BIRTH_TIMES = [
  "",
  " ",
  "7:20",
  "24:00",
  "07:60",
  "07:20:60",
  "07:20.5",
  "07:20:27.",
  "07:20:27.1234567",
  "07:20:27:00",
  "07:20:27Z",
  "07:20:27+00:00",
  " 07:20",
  "07:20 ",
  "not a time",
];

export async function mount(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));

  return {
    container,
    async rerender(nextElement) {
      await act(async () => root.render(nextElement));
    },
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

export function getByTestId(container, testId) {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  if (!element) throw new Error(`No element with data-testid="${testId}"`);
  return element;
}

export async function setInputValue(input, value) {
  await act(async () => {
    // Use the native setter so React receives a user edit instead of a tracked assignment.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

export async function click(element) {
  await act(async () => element.click());
}
