import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_2 = __compactRuntime.CompactTypeBoolean;

const _descriptor_3 = new __compactRuntime.CompactTypeBytes(32);

class _Either_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_2.fromValue(value_0),
      left: _descriptor_3.fromValue(value_0),
      right: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.is_left).concat(_descriptor_3.toValue(value_0.left).concat(_descriptor_3.toValue(value_0.right)));
  }
}

const _descriptor_4 = new _Either_0();

class _ContractAddress_0 {
  alignment() {
    return _descriptor_3.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.bytes);
  }
}

const _descriptor_5 = new _ContractAddress_0();

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      addLiquidity: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`addLiquidity: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amountAKD_0 = args_1[1];
        const amountNight_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 1 (as invoked from Typescript)',
                                     'swap.compact line 11 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amountAKD_0) === 'bigint' && amountAKD_0 >= 0n && amountAKD_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'swap.compact line 11 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amountAKD_0)
        }
        if (!(typeof(amountNight_0) === 'bigint' && amountNight_0 >= 0n && amountNight_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'swap.compact line 11 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amountNight_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(amountAKD_0).concat(_descriptor_0.toValue(amountNight_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._addLiquidity_0(context,
                                              partialProofData,
                                              amountAKD_0,
                                              amountNight_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      swapAkdToNight: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`swapAkdToNight: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const dx_0 = args_1[1];
        const dy_0 = args_1[2];
        const minOut_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('swapAkdToNight',
                                     'argument 1 (as invoked from Typescript)',
                                     'swap.compact line 25 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(dx_0) === 'bigint' && dx_0 >= 0n && dx_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapAkdToNight',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'swap.compact line 25 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dx_0)
        }
        if (!(typeof(dy_0) === 'bigint' && dy_0 >= 0n && dy_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapAkdToNight',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'swap.compact line 25 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dy_0)
        }
        if (!(typeof(minOut_0) === 'bigint' && minOut_0 >= 0n && minOut_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapAkdToNight',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'swap.compact line 25 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     minOut_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(dx_0).concat(_descriptor_0.toValue(dy_0).concat(_descriptor_0.toValue(minOut_0))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._swapAkdToNight_0(context,
                                                partialProofData,
                                                dx_0,
                                                dy_0,
                                                minOut_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      swapNightToAkd: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`swapNightToAkd: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const dx_0 = args_1[1];
        const dy_0 = args_1[2];
        const minOut_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('swapNightToAkd',
                                     'argument 1 (as invoked from Typescript)',
                                     'swap.compact line 49 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(dx_0) === 'bigint' && dx_0 >= 0n && dx_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapNightToAkd',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'swap.compact line 49 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dx_0)
        }
        if (!(typeof(dy_0) === 'bigint' && dy_0 >= 0n && dy_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapNightToAkd',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'swap.compact line 49 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dy_0)
        }
        if (!(typeof(minOut_0) === 'bigint' && minOut_0 >= 0n && minOut_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapNightToAkd',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'swap.compact line 49 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     minOut_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(dx_0).concat(_descriptor_0.toValue(dy_0).concat(_descriptor_0.toValue(minOut_0))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._swapNightToAkd_0(context,
                                                partialProofData,
                                                dx_0,
                                                dy_0,
                                                minOut_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      addLiquidity: this.circuits.addLiquidity,
      swapAkdToNight: this.circuits.swapAkdToNight,
      swapNightToAkd: this.circuits.swapNightToAkd
    };
    this.provableCircuits = {
      addLiquidity: this.circuits.addLiquidity,
      swapAkdToNight: this.circuits.swapAkdToNight,
      swapNightToAkd: this.circuits.swapNightToAkd
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('addLiquidity', new __compactRuntime.ContractOperation());
    state_0.setOperation('swapAkdToNight', new __compactRuntime.ContractOperation());
    state_0.setOperation('swapNightToAkd', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(1n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _addLiquidity_0(context, partialProofData, amountAKD_0, amountNight_0) {
    const x_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_6.toValue(0n),
                                                                                                      alignment: _descriptor_6.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    const y_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_6.toValue(1n),
                                                                                                      alignment: _descriptor_6.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(this._equal_0(x_0, 0n) && this._equal_1(y_0, 0n),
                            'liquidity already seeded');
    __compactRuntime.assert(amountAKD_0 > 0n && amountNight_0 > 0n,
                            'amounts must be positive');
    __compactRuntime.assert(amountAKD_0 <= 1000000000000000000n,
                            'amountAKD exceeds safe bound');
    __compactRuntime.assert(amountNight_0 <= 1000000000000000000n,
                            'amountNight exceeds safe bound');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(amountAKD_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(1n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(amountNight_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _swapAkdToNight_0(context, partialProofData, dx_0, dy_0, minOut_0) {
    const x_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_6.toValue(0n),
                                                                                                      alignment: _descriptor_6.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    const y_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_6.toValue(1n),
                                                                                                      alignment: _descriptor_6.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(x_0 > 0n && y_0 > 0n, 'pool not initialized');
    __compactRuntime.assert(dx_0 > 0n, 'amount must be positive');
    __compactRuntime.assert(dy_0 > 0n, 'output rounds to zero');
    __compactRuntime.assert(dy_0 >= minOut_0, 'slippage: insufficient output');
    __compactRuntime.assert(dy_0 < y_0, 'cannot drain full reserve');
    let t_0;
    __compactRuntime.assert((t_0 = x_0 + dx_0, t_0 <= 1000000000000000000n),
                            'reserveAKD exceeds safe bound');
    __compactRuntime.assert(y_0 <= 1000000000000000000n,
                            'reserveNight exceeds safe bound');
    const xBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('swap.compact line 37 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(x_0);
    const dxBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('swap.compact line 38 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dx_0);
    const yBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('swap.compact line 39 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(y_0);
    const dyBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('swap.compact line 40 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dy_0);
    let t_1;
    __compactRuntime.assert((t_1 = (xBig_0 + dxBig_0)
                                   *
                                   (__compactRuntime.assert(yBig_0 >= dyBig_0,
                                                            'result of subtraction would be negative'),
                                    yBig_0 - dyBig_0),
                             t_1 >= xBig_0 * yBig_0),
                            'invalid swap: violates constant product invariant');
    const tmp_0 = ((t1) => {
                    if (t1 > 340282366920938463463374607431768211455n) {
                      throw new __compactRuntime.CompactError('swap.compact line 44 char 29: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(x_0 + dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = (__compactRuntime.assert(y_0 >= dy_0,
                                           'result of subtraction would be negative'),
                   y_0 - dy_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(1n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _swapNightToAkd_0(context, partialProofData, dx_0, dy_0, minOut_0) {
    const x_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_6.toValue(1n),
                                                                                                      alignment: _descriptor_6.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    const y_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_6.toValue(0n),
                                                                                                      alignment: _descriptor_6.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(x_0 > 0n && y_0 > 0n, 'pool not initialized');
    __compactRuntime.assert(dx_0 > 0n, 'amount must be positive');
    __compactRuntime.assert(dy_0 > 0n, 'output rounds to zero');
    __compactRuntime.assert(dy_0 >= minOut_0, 'slippage: insufficient output');
    __compactRuntime.assert(dy_0 < y_0, 'cannot drain full reserve');
    let t_0;
    __compactRuntime.assert((t_0 = x_0 + dx_0, t_0 <= 1000000000000000000n),
                            'reserveNight exceeds safe bound');
    __compactRuntime.assert(y_0 <= 1000000000000000000n,
                            'reserveAKD exceeds safe bound');
    const xBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('swap.compact line 61 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(x_0);
    const dxBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('swap.compact line 62 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dx_0);
    const yBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('swap.compact line 63 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(y_0);
    const dyBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('swap.compact line 64 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dy_0);
    let t_1;
    __compactRuntime.assert((t_1 = (xBig_0 + dxBig_0)
                                   *
                                   (__compactRuntime.assert(yBig_0 >= dyBig_0,
                                                            'result of subtraction would be negative'),
                                    yBig_0 - dyBig_0),
                             t_1 >= xBig_0 * yBig_0),
                            'invalid swap: violates constant product invariant');
    const tmp_0 = ((t1) => {
                    if (t1 > 340282366920938463463374607431768211455n) {
                      throw new __compactRuntime.CompactError('swap.compact line 68 char 31: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(x_0 + dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(1n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = (__compactRuntime.assert(y_0 >= dy_0,
                                           'result of subtraction would be negative'),
                   y_0 - dy_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _equal_0(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get reserveAKD() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_6.toValue(0n),
                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get reserveNight() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_6.toValue(1n),
                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({ });
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
