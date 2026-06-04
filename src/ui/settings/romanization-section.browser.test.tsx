import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { useSettingsStore } from "@/stores/settings";
import { RomanizationSettingsSection } from "@/ui/settings/romanization-section";

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

beforeEach(() => {
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  useSettingsStore.setState({ romanizationApiBase: "", romanizationTurnstileSiteKey: "" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("RomanizationSettingsSection", () => {
  it("renders the api base and site key inputs and a test connection button", async () => {
    const screen = await render(<RomanizationSettingsSection />);
    await expect.element(screen.getByLabelText("API base URL")).toBeInTheDocument();
    await expect.element(screen.getByLabelText("Turnstile site key")).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "Test connection" })).toBeInTheDocument();
  });

  it("persists the api base to the settings store on input", async () => {
    const screen = await render(<RomanizationSettingsSection />);
    const input = screen.getByLabelText("API base URL");
    await input.fill("https://example.test");
    await expect.poll(() => useSettingsStore.getState().romanizationApiBase).toBe("https://example.test");
  });

  it("persists the site key to the settings store on input", async () => {
    const screen = await render(<RomanizationSettingsSection />);
    const input = screen.getByLabelText("Turnstile site key");
    await input.fill("self-host-key");
    await expect.poll(() => useSettingsStore.getState().romanizationTurnstileSiteKey).toBe("self-host-key");
  });

  it("calls test connection and shows a success toast with capability info on 200 ok", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ status: "ok", version: "0.1.0", libraries: ["cutlet", "pypinyin"], google_fallback: false }),
      );
    vi.stubGlobal("fetch", fetchStub);

    useSettingsStore.setState({ romanizationApiBase: "https://example.test" });
    const screen = await render(<RomanizationSettingsSection />);
    await screen.getByRole("button", { name: "Test connection" }).click();
    await expect.poll(() => fetchStub.mock.calls.length).toBe(1);
    expect(fetchStub.mock.calls[0][0]).toBe("https://example.test/health");
    await expect.poll(() => toastMock.success.mock.calls.length).toBeGreaterThan(0);
    const message = toastMock.success.mock.calls[0][0] as string;
    expect(message).toContain("cutlet");
  });

  it("falls back to the default api base when no override is set", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: "ok", version: "0.1.0", libraries: [], google_fallback: false }));
    vi.stubGlobal("fetch", fetchStub);

    const screen = await render(<RomanizationSettingsSection />);
    await screen.getByRole("button", { name: "Test connection" }).click();
    await expect.poll(() => fetchStub.mock.calls.length).toBe(1);
    expect(fetchStub.mock.calls[0][0]).toBe("https://composer-romanization-api.boidu.dev/health");
  });

  it("shows an error toast on a non-200 response", async () => {
    const fetchStub = vi.fn().mockResolvedValue(jsonResponse({ status: "error" }, 503));
    vi.stubGlobal("fetch", fetchStub);

    const screen = await render(<RomanizationSettingsSection />);
    await screen.getByRole("button", { name: "Test connection" }).click();
    await expect.poll(() => toastMock.error.mock.calls.length).toBeGreaterThan(0);
  });

  it("shows an error toast on a network failure", async () => {
    const fetchStub = vi.fn().mockRejectedValue(new TypeError("network down"));
    vi.stubGlobal("fetch", fetchStub);

    const screen = await render(<RomanizationSettingsSection />);
    await screen.getByRole("button", { name: "Test connection" }).click();
    await expect.poll(() => toastMock.error.mock.calls.length).toBeGreaterThan(0);
  });

  it("disables the test connection button while a request is in flight", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const fetchStub = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchStub);

    const screen = await render(<RomanizationSettingsSection />);
    const button = screen.getByRole("button", { name: "Test connection" });
    await button.click();
    await expect.element(button).toBeDisabled();

    resolveFetch(jsonResponse({ status: "ok", version: "0.1.0", libraries: [], google_fallback: false }));
    await expect.element(button).not.toBeDisabled();
  });
});
