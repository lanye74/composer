import { SEGMENT_SAMPLES, computeMagspec, waveformFromComplexAsChannels } from "@/audio/separation/demucs-spec";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

function impulseChannels(position: number): Float32Array[] {
  const left = new Float32Array(SEGMENT_SAMPLES);
  const right = new Float32Array(SEGMENT_SAMPLES);
  left[position] = 1;
  right[position] = 1;
  return [left, right];
}

function argmaxAbs(arr: Float32Array): { index: number; value: number } {
  let index = 0;
  let value = Math.abs(arr[0]);
  for (let i = 1; i < arr.length; i++) {
    const v = Math.abs(arr[i]);
    if (v > value) {
      value = v;
      index = i;
    }
  }
  return { index, value };
}

function roundtripImpulse(position: number): Float32Array[] {
  const channels = impulseChannels(position);
  const spec = computeMagspec(channels);
  return waveformFromComplexAsChannels(spec);
}

const IMPULSE_POSITIONS = [50_000, 100_000, 171_990, 250_000, 300_000];

// -- Tests --------------------------------------------------------------------

describe("impulse alignment", () => {
  for (const position of IMPULSE_POSITIONS) {
    it(`reconstructs an impulse at sample ${position} within 1 sample on both channels`, () => {
      const out = roundtripImpulse(position);

      const left = argmaxAbs(out[0]);
      const right = argmaxAbs(out[1]);

      expect(Math.abs(left.index - position)).toBeLessThanOrEqual(1);
      expect(Math.abs(right.index - position)).toBeLessThanOrEqual(1);
    });
  }
});

describe("shape and magnitude invariants", () => {
  it("returns two channels of SEGMENT_SAMPLES each", () => {
    const out = roundtripImpulse(100_000);
    expect(out.length).toBe(2);
    expect(out[0].length).toBe(SEGMENT_SAMPLES);
    expect(out[1].length).toBe(SEGMENT_SAMPLES);
  });

  it("preserves impulse peak magnitude within 30 percent of unity", () => {
    const out = roundtripImpulse(100_000);
    const left = argmaxAbs(out[0]);
    const right = argmaxAbs(out[1]);

    expect(Math.abs(left.value - 1)).toBeLessThan(0.3);
    expect(Math.abs(right.value - 1)).toBeLessThan(0.3);
  });
});

describe("edge cases", () => {
  it("returns silence for silent input", () => {
    const channels = [new Float32Array(SEGMENT_SAMPLES), new Float32Array(SEGMENT_SAMPLES)];
    const spec = computeMagspec(channels);
    const out = waveformFromComplexAsChannels(spec);

    const left = argmaxAbs(out[0]);
    const right = argmaxAbs(out[1]);

    expect(left.value).toBeLessThanOrEqual(1e-6);
    expect(right.value).toBeLessThanOrEqual(1e-6);
  });

  it("reconstructs an impulse at sample 0 within 1 sample", () => {
    const out = roundtripImpulse(0);
    const left = argmaxAbs(out[0]);
    const right = argmaxAbs(out[1]);

    expect(Math.abs(left.index - 0)).toBeLessThanOrEqual(1);
    expect(Math.abs(right.index - 0)).toBeLessThanOrEqual(1);
  });

  it("reconstructs an impulse at the last sample within 1 sample", () => {
    const position = SEGMENT_SAMPLES - 1;
    const out = roundtripImpulse(position);
    const left = argmaxAbs(out[0]);
    const right = argmaxAbs(out[1]);

    expect(Math.abs(left.index - position)).toBeLessThanOrEqual(1);
    expect(Math.abs(right.index - position)).toBeLessThanOrEqual(1);
  });
});
