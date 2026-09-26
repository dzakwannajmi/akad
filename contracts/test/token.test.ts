// L3 tests for the AKD token circuits of akad.compact (v1): constructor,
// transfer, claimFaucet, recordTokenColor, wrap and unwrap. Names cite the
// source lines of each circuit and assert.
import { describe, expect, it } from 'vitest';
import {
  ALICE,
  AkadSim,
  BOB,
  CONTRACT_ADDRESS,
  DEPLOYER,
  FAUCET_AMOUNT,
  FAUCET_KEY,
  INITIAL_SUPPLY,
  failedAssert,
  hex,
  keyOf,
} from './harness.js';

const U64_MAX = 2n ** 64n - 1n;

/** A deployment with both colors recorded, the state wrap and unwrap run in. */
function withColors(): AkadSim {
  const sim = AkadSim.deploy();
  sim.call(DEPLOYER, 'recordTokenColor', []);
  return sim;
}

describe('constructor L249-L260', () => {
  it('mints the whole supply to the deployer and records the faucet key', () => {
    const sim = AkadSim.deploy();
    expect(sim.balanceOf(keyOf(DEPLOYER))).toBe(INITIAL_SUPPLY);
    expect(sim.ledger.totalSupply).toBe(INITIAL_SUPPLY);
    expect(hex(sim.ledger.faucetAddress)).toBe(hex(FAUCET_KEY));
    expect(sim.ledger.balances.size()).toBe(1n);
  });

  it('leaves the colors, reserves and sNIGHT supply unset', () => {
    const ledger = AkadSim.deploy().ledger;
    expect(hex(ledger.tokenColor)).toBe('00'.repeat(32));
    expect(hex(ledger.sNightColor)).toBe('00'.repeat(32));
    expect([ledger.reserveAKD, ledger.reserveNight, ledger.sNightSupply]).toEqual([0n, 0n, 0n]);
  });
});

describe('transfer L263-L275', () => {
  it('moves AKD from the caller to a recipient without an entry (balanceOf default, L224-L229)', () => {
    const sim = AkadSim.deploy();
    const result = sim.call(DEPLOYER, 'transfer', [keyOf(ALICE), 700n]);
    expect(sim.balanceOf(keyOf(DEPLOYER))).toBe(INITIAL_SUPPLY - 700n);
    expect(sim.balanceOf(keyOf(ALICE))).toBe(700n);
    expect(sim.ledger.totalSupply).toBe(INITIAL_SUPPLY);
    expect([result.nightIn, result.nightOut, result.outputs.length]).toEqual([0n, 0n, 0]);
  });

  it('allows a transfer of the whole balance', () => {
    const sim = AkadSim.deploy();
    sim.call(DEPLOYER, 'transfer', [keyOf(ALICE), 5n]);
    sim.call(ALICE, 'transfer', [keyOf(BOB), 5n]);
    expect(sim.balanceOf(keyOf(ALICE))).toBe(0n);
    expect(sim.balanceOf(keyOf(BOB))).toBe(5n);
  });

  it('assert L267 "insufficient balance"', () => {
    const sim = AkadSim.deploy();
    sim.call(DEPLOYER, 'transfer', [keyOf(ALICE), 5n]);
    expect(() => sim.call(ALICE, 'transfer', [keyOf(BOB), 6n])).toThrow(failedAssert('insufficient balance'));
    expect(() => sim.call(BOB, 'transfer', [keyOf(ALICE), 1n])).toThrow(failedAssert('insufficient balance'));
    expect(sim.balanceOf(keyOf(ALICE))).toBe(5n);
  });
});

describe('claimFaucet L285-L301', () => {
  it('pays 50 AKD from the faucet account once per wallet', () => {
    const sim = AkadSim.deploy();
    sim.call(DEPLOYER, 'transfer', [FAUCET_KEY, 2n * FAUCET_AMOUNT]);
    sim.call(ALICE, 'claimFaucet', []);
    expect(sim.balanceOf(keyOf(ALICE))).toBe(FAUCET_AMOUNT);
    expect(sim.balanceOf(FAUCET_KEY)).toBe(FAUCET_AMOUNT);
    expect(sim.ledger.faucetClaimed.lookup(keyOf(ALICE))).toBe(true);
    expect(sim.ledger.faucetClaimed.member(keyOf(BOB))).toBe(false);
  });

  it('pays out the last 50 AKD when the faucet holds exactly that much', () => {
    const sim = AkadSim.deploy();
    sim.call(DEPLOYER, 'transfer', [FAUCET_KEY, FAUCET_AMOUNT]);
    sim.call(ALICE, 'claimFaucet', []);
    expect(sim.balanceOf(FAUCET_KEY)).toBe(0n);
  });

  it('assert L287 "this wallet has already claimed from the faucet"', () => {
    const sim = AkadSim.deploy();
    sim.call(DEPLOYER, 'transfer', [FAUCET_KEY, 2n * FAUCET_AMOUNT]);
    sim.call(ALICE, 'claimFaucet', []);
    expect(() => sim.call(ALICE, 'claimFaucet', [])).toThrow(
      failedAssert('this wallet has already claimed from the faucet')
    );
  });

  it('assert L291 "faucet is empty, ask the deployer to top it up"', () => {
    const sim = AkadSim.deploy();
    sim.call(DEPLOYER, 'transfer', [FAUCET_KEY, FAUCET_AMOUNT - 1n]);
    expect(() => sim.call(ALICE, 'claimFaucet', [])).toThrow(
      failedAssert('faucet is empty, ask the deployer to top it up')
    );
  });
});

describe('recordTokenColor L323-L326', () => {
  it('writes two distinct colors that depend on the contract address', () => {
    const ledger = withColors().ledger;
    expect(hex(ledger.tokenColor)).not.toBe('00'.repeat(32));
    expect(hex(ledger.sNightColor)).not.toBe('00'.repeat(32));
    expect(hex(ledger.tokenColor)).not.toBe(hex(ledger.sNightColor));
  });

  it('records the color wrap() stamps on a minted coin (P-02)', () => {
    const sim = withColors();
    const [minted] = sim.call(DEPLOYER, 'wrap', [10n]).outputs;
    expect(hex(minted?.coinInfo.color ?? new Uint8Array())).toBe(hex(sim.ledger.tokenColor));
  });

  it('writes the same bytes whoever calls it, so repeating it changes nothing', () => {
    const sim = withColors();
    const before = [hex(sim.ledger.tokenColor), hex(sim.ledger.sNightColor)];
    sim.call(BOB, 'recordTokenColor', []);
    expect([hex(sim.ledger.tokenColor), hex(sim.ledger.sNightColor)]).toEqual(before);
  });
});

describe('wrap L335-L351', () => {
  it('debits the public balance and mints an AKD coin of the same value to the caller', () => {
    const sim = withColors();
    const result = sim.call(DEPLOYER, 'wrap', [250n]);
    expect(sim.balanceOf(keyOf(DEPLOYER))).toBe(INITIAL_SUPPLY - 250n);
    expect(result.outputs).toHaveLength(1);
    const [minted] = result.outputs;
    expect(minted?.coinInfo.value).toBe(250n);
    expect(hex(minted?.coinInfo.color ?? new Uint8Array())).toBe(hex(sim.ledger.tokenColor));
    expect(minted?.recipient.is_left).toBe(true);
    expect(hex(minted?.recipient.left.bytes ?? new Uint8Array())).toBe(DEPLOYER);
    expect([...result.effects.shieldedMints.values()]).toEqual([250n]);
  });

  it('gives each minted coin the nonce from the coinNonce() witness, so two wraps never collide', () => {
    const sim = withColors();
    const [first] = sim.call(DEPLOYER, 'wrap', [1n]).outputs;
    const [second] = sim.call(DEPLOYER, 'wrap', [1n]).outputs;
    expect(hex(first?.coinInfo.nonce ?? new Uint8Array())).not.toBe(hex(second?.coinInfo.nonce ?? new Uint8Array()));
  });

  it('assert L339 "insufficient balance to wrap"', () => {
    const sim = withColors();
    expect(() => sim.call(ALICE, 'wrap', [1n])).toThrow(failedAssert('insufficient balance to wrap'));
  });

  it('assert L340 "amount must be positive"', () => {
    const sim = withColors();
    expect(() => sim.call(DEPLOYER, 'wrap', [0n])).toThrow(failedAssert('amount must be positive'));
  });

  // Unreachable through circuit calls: balances never exceed the 1e12
  // supply, and the runtime refuses a coin worth more than Uint<64>, so no
  // unwrap can raise a balance this high. The balance is set directly so the
  // defensive check itself is exercised.
  it('assert L341 "amount exceeds shielded mint bound (Uint<64>)"', () => {
    const sim = withColors();
    sim.injectBalance(keyOf(ALICE), U64_MAX + 1n);
    expect(() => sim.call(ALICE, 'wrap', [U64_MAX + 1n])).toThrow(
      failedAssert('amount exceeds shielded mint bound (Uint<64>)')
    );
    expect(sim.call(ALICE, 'wrap', [U64_MAX]).outputs[0]?.coinInfo.value).toBe(U64_MAX);
  });
});

describe('unwrap L361-L372', () => {
  it('receives an AKD coin into the contract and credits its value to the caller', () => {
    const sim = withColors();
    const [minted] = sim.call(DEPLOYER, 'wrap', [400n]).outputs;
    if (minted === undefined) throw new Error('wrap minted nothing');
    sim.call(DEPLOYER, 'transfer', [keyOf(ALICE), 1n]);
    const result = sim.call(ALICE, 'unwrap', [], minted.coinInfo);
    expect(sim.balanceOf(keyOf(ALICE))).toBe(401n);
    expect(result.effects.claimedShieldedReceives).toHaveLength(1);
    const [received] = result.outputs;
    expect(received?.recipient.is_left).toBe(false);
    expect(hex(received?.recipient.right.bytes ?? new Uint8Array())).toBe(CONTRACT_ADDRESS);
    expect(received?.coinInfo.value).toBe(400n);
  });

  it('takes no argument: the coin comes only from the spentCoin() witness (P-04)', () => {
    const sim = withColors();
    const coin = sim.coin(sim.ledger.tokenColor, 9n);
    const result = sim.call(ALICE, 'unwrap', [], coin);
    expect(result.transcript.length).toBeGreaterThan(0);
    const published = JSON.stringify(result.transcript, (_key, value: unknown) =>
      value instanceof Uint8Array ? hex(value) : typeof value === 'bigint' ? value.toString() : value
    );
    expect(published).not.toContain(hex(coin.nonce));
  });

  it('assert L363 "wrong token color"', () => {
    const sim = withColors();
    expect(() => sim.call(ALICE, 'unwrap', [], sim.coin(sim.ledger.sNightColor, 5n))).toThrow(
      failedAssert('wrong token color')
    );
    expect(sim.balanceOf(keyOf(ALICE))).toBe(0n);
  });
});
