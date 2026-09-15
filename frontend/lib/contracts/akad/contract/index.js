import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

const _descriptor_1 = new __compactRuntime.CompactTypeBytes(32);

class _UserAddress_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_2 = new _UserAddress_0();

const _descriptor_3 = __compactRuntime.CompactTypeBoolean;

class _ContractAddress_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_4 = new _ContractAddress_0();

class _ShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_1.fromValue(value_0),
      color: _descriptor_1.fromValue(value_0),
      value: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.nonce).concat(_descriptor_1.toValue(value_0.color).concat(_descriptor_0.toValue(value_0.value)));
  }
}

const _descriptor_5 = new _ShieldedCoinInfo_0();

class _ZswapCoinPublicKey_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_6 = new _ZswapCoinPublicKey_0();

class _Either_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_6.alignment().concat(_descriptor_4.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_3.fromValue(value_0),
      left: _descriptor_6.fromValue(value_0),
      right: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.is_left).concat(_descriptor_6.toValue(value_0.left).concat(_descriptor_4.toValue(value_0.right)));
  }
}

const _descriptor_7 = new _Either_0();

const _descriptor_8 = new __compactRuntime.CompactTypeBytes(21);

class _CoinPreimage_0 {
  alignment() {
    return _descriptor_8.alignment().concat(_descriptor_5.alignment().concat(_descriptor_3.alignment().concat(_descriptor_1.alignment())));
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_8.fromValue(value_0),
      info: _descriptor_5.fromValue(value_0),
      dataType: _descriptor_3.fromValue(value_0),
      data: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_8.toValue(value_0.domain_sep).concat(_descriptor_5.toValue(value_0.info).concat(_descriptor_3.toValue(value_0.dataType).concat(_descriptor_1.toValue(value_0.data))));
  }
}

const _descriptor_9 = new _CoinPreimage_0();

const _descriptor_10 = new __compactRuntime.CompactTypeVector(2, _descriptor_1);

const _descriptor_11 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

class _Either_1 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_3.fromValue(value_0),
      left: _descriptor_1.fromValue(value_0),
      right: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.is_left).concat(_descriptor_1.toValue(value_0.left).concat(_descriptor_1.toValue(value_0.right)));
  }
}

const _descriptor_12 = new _Either_1();

class _Either_2 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_4.alignment().concat(_descriptor_2.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_3.fromValue(value_0),
      left: _descriptor_4.fromValue(value_0),
      right: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.is_left).concat(_descriptor_4.toValue(value_0.left).concat(_descriptor_2.toValue(value_0.right)));
  }
}

const _descriptor_13 = new _Either_2();

const _descriptor_14 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

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
    if (typeof(witnesses_0.coinNonce) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named coinNonce');
    }
    if (typeof(witnesses_0.spentCoin) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named spentCoin');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      transfer: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`transfer: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const to_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('transfer',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 263 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(to_0.buffer instanceof ArrayBuffer && to_0.BYTES_PER_ELEMENT === 1 && to_0.length === 32)) {
          __compactRuntime.typeError('transfer',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 263 char 1',
                                     'Bytes<32>',
                                     to_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('transfer',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 263 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(to_0).concat(_descriptor_0.toValue(amount_0)),
            alignment: _descriptor_1.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._transfer_0(context,
                                          partialProofData,
                                          to_0,
                                          amount_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      claimFaucet: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`claimFaucet: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('claimFaucet',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 285 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._claimFaucet_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      recordTokenColor: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`recordTokenColor: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('recordTokenColor',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 323 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._recordTokenColor_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      wrap: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`wrap: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amount_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('wrap',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 335 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('wrap',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 335 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(amount_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._wrap_0(context, partialProofData, amount_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      unwrap: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`unwrap: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('unwrap',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 361 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._unwrap_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
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
                                     'akad.compact line 378 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amountAKD_0) === 'bigint' && amountAKD_0 >= 0n && amountAKD_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 378 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amountAKD_0)
        }
        if (!(typeof(amountNight_0) === 'bigint' && amountNight_0 >= 0n && amountNight_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 378 char 1',
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
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`swapAkdToNight: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const dx_0 = args_1[1];
        const dy_0 = args_1[2];
        const minOut_0 = args_1[3];
        const recipient_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('swapAkdToNight',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 420 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(dx_0) === 'bigint' && dx_0 >= 0n && dx_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapAkdToNight',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 420 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dx_0)
        }
        if (!(typeof(dy_0) === 'bigint' && dy_0 >= 0n && dy_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapAkdToNight',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 420 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dy_0)
        }
        if (!(typeof(minOut_0) === 'bigint' && minOut_0 >= 0n && minOut_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapAkdToNight',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'akad.compact line 420 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     minOut_0)
        }
        if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
          __compactRuntime.typeError('swapAkdToNight',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'akad.compact line 420 char 1',
                                     'struct UserAddress<bytes: Bytes<32>>',
                                     recipient_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(dx_0).concat(_descriptor_0.toValue(dy_0).concat(_descriptor_0.toValue(minOut_0).concat(_descriptor_2.toValue(recipient_0)))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._swapAkdToNight_0(context,
                                                partialProofData,
                                                dx_0,
                                                dy_0,
                                                minOut_0,
                                                recipient_0);
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
                                     'akad.compact line 461 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(dx_0) === 'bigint' && dx_0 >= 0n && dx_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapNightToAkd',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 461 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dx_0)
        }
        if (!(typeof(dy_0) === 'bigint' && dy_0 >= 0n && dy_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapNightToAkd',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 461 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dy_0)
        }
        if (!(typeof(minOut_0) === 'bigint' && minOut_0 >= 0n && minOut_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapNightToAkd',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'akad.compact line 461 char 1',
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
      },
      unwrapNight: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`unwrapNight: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const recipient_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('unwrapNight',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 538 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
          __compactRuntime.typeError('unwrapNight',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 538 char 1',
                                     'struct UserAddress<bytes: Bytes<32>>',
                                     recipient_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(recipient_0),
            alignment: _descriptor_2.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._unwrapNight_0(context,
                                             partialProofData,
                                             recipient_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      shieldedSwapAkdToNight: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`shieldedSwapAkdToNight: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const dy_0 = args_1[1];
        const minOut_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('shieldedSwapAkdToNight',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 576 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(dy_0) === 'bigint' && dy_0 >= 0n && dy_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('shieldedSwapAkdToNight',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 576 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dy_0)
        }
        if (!(typeof(minOut_0) === 'bigint' && minOut_0 >= 0n && minOut_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('shieldedSwapAkdToNight',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 576 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     minOut_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(dy_0).concat(_descriptor_0.toValue(minOut_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._shieldedSwapAkdToNight_0(context,
                                                        partialProofData,
                                                        dy_0,
                                                        minOut_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      shieldedSwapNightToAkd: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`shieldedSwapNightToAkd: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const dy_0 = args_1[1];
        const minOut_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('shieldedSwapNightToAkd',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 624 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(dy_0) === 'bigint' && dy_0 >= 0n && dy_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('shieldedSwapNightToAkd',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 624 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dy_0)
        }
        if (!(typeof(minOut_0) === 'bigint' && minOut_0 >= 0n && minOut_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('shieldedSwapNightToAkd',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 624 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     minOut_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(dy_0).concat(_descriptor_0.toValue(minOut_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._shieldedSwapNightToAkd_0(context,
                                                        partialProofData,
                                                        dy_0,
                                                        minOut_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      transfer: this.circuits.transfer,
      claimFaucet: this.circuits.claimFaucet,
      recordTokenColor: this.circuits.recordTokenColor,
      wrap: this.circuits.wrap,
      unwrap: this.circuits.unwrap,
      addLiquidity: this.circuits.addLiquidity,
      swapAkdToNight: this.circuits.swapAkdToNight,
      swapNightToAkd: this.circuits.swapNightToAkd,
      unwrapNight: this.circuits.unwrapNight,
      shieldedSwapAkdToNight: this.circuits.shieldedSwapAkdToNight,
      shieldedSwapNightToAkd: this.circuits.shieldedSwapNightToAkd
    };
    this.provableCircuits = {
      transfer: this.circuits.transfer,
      claimFaucet: this.circuits.claimFaucet,
      recordTokenColor: this.circuits.recordTokenColor,
      wrap: this.circuits.wrap,
      unwrap: this.circuits.unwrap,
      addLiquidity: this.circuits.addLiquidity,
      swapAkdToNight: this.circuits.swapAkdToNight,
      swapNightToAkd: this.circuits.swapNightToAkd,
      unwrapNight: this.circuits.unwrapNight,
      shieldedSwapAkdToNight: this.circuits.shieldedSwapAkdToNight,
      shieldedSwapNightToAkd: this.circuits.shieldedSwapNightToAkd
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
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
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
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('transfer', new __compactRuntime.ContractOperation());
    state_0.setOperation('claimFaucet', new __compactRuntime.ContractOperation());
    state_0.setOperation('recordTokenColor', new __compactRuntime.ContractOperation());
    state_0.setOperation('wrap', new __compactRuntime.ContractOperation());
    state_0.setOperation('unwrap', new __compactRuntime.ContractOperation());
    state_0.setOperation('addLiquidity', new __compactRuntime.ContractOperation());
    state_0.setOperation('swapAkdToNight', new __compactRuntime.ContractOperation());
    state_0.setOperation('swapNightToAkd', new __compactRuntime.ContractOperation());
    state_0.setOperation('unwrapNight', new __compactRuntime.ContractOperation());
    state_0.setOperation('shieldedSwapAkdToNight', new __compactRuntime.ContractOperation());
    state_0.setOperation('shieldedSwapNightToAkd', new __compactRuntime.ContractOperation());
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(0n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(1n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(2n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(3n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(4n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(5n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(6n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(7n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(8n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const owner_0 = this._callerKey_0(context, partialProofData);
    const tmp_0 = 1000000000000n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(owner_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_1 = 1000000000000n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(1n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_2 = this._faucetKey_0();
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(3n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_2),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _left_0(value_0) {
    return { is_left: true, left: value_0, right: new Uint8Array(32) };
  }
  _left_1(value_0) {
    return { is_left: true, left: value_0, right: { bytes: new Uint8Array(32) } };
  }
  _right_0(value_0) {
    return { is_left: false, left: { bytes: new Uint8Array(32) }, right: value_0 };
  }
  _right_1(value_0) {
    return { is_left: false, left: { bytes: new Uint8Array(32) }, right: value_0 };
  }
  _nativeToken_0() {
    return new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  }
  _tokenType_0(domain_sep_0, contractAddress_0) {
    return this._persistentCommit_0([domain_sep_0, contractAddress_0.bytes],
                                    new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 100, 101, 114, 105, 118, 101, 95, 116, 111, 107, 101, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  }
  _mintShieldedToken_0(context,
                       partialProofData,
                       domain_sep_0,
                       value_0,
                       nonce_0,
                       recipient_0)
  {
    const coin_0 = { nonce: nonce_0,
                     color:
                       this._tokenType_0(domain_sep_0,
                                         _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                   partialProofData,
                                                                                                   [
                                                                                                    { dup: { n: 2 } },
                                                                                                    { idx: { cached: true,
                                                                                                             pushPath: false,
                                                                                                             path: [
                                                                                                                    { tag: 'value',
                                                                                                                      value: { value: _descriptor_11.toValue(0n),
                                                                                                                               alignment: _descriptor_11.alignment() } }] } },
                                                                                                    { popeq: { cached: true,
                                                                                                               result: undefined } }]).value)),
                     value: value_0 };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(4n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(domain_sep_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_14.toValue(value_0),
                                                                                              alignment: _descriptor_14.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    this._createZswapOutput_0(context, partialProofData, coin_0, recipient_0);
    const cm_0 = this._coinCommitment_0(coin_0, recipient_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(2n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(cm_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    if (!recipient_0.is_left
        &&
        this._equal_0(recipient_0.right.bytes,
                      _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 2 } },
                                                                                 { idx: { cached: true,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_11.toValue(0n),
                                                                                                            alignment: _descriptor_11.alignment() } }] } },
                                                                                 { popeq: { cached: true,
                                                                                            result: undefined } }]).value).bytes))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_11.toValue(1n),
                                                                    alignment: _descriptor_11.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(cm_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
    }
    return coin_0;
  }
  _receiveShielded_0(context, partialProofData, coin_0) {
    const recipient_0 = this._right_1(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                partialProofData,
                                                                                                [
                                                                                                 { dup: { n: 2 } },
                                                                                                 { idx: { cached: true,
                                                                                                          pushPath: false,
                                                                                                          path: [
                                                                                                                 { tag: 'value',
                                                                                                                   value: { value: _descriptor_11.toValue(0n),
                                                                                                                            alignment: _descriptor_11.alignment() } }] } },
                                                                                                 { popeq: { cached: true,
                                                                                                            result: undefined } }]).value));
    this._createZswapOutput_0(context, partialProofData, coin_0, recipient_0);
    const tmp_0 = this._coinCommitment_0(coin_0, recipient_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(1n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    return [];
  }
  _coinCommitment_0(coin_0, recipient_0) {
    return this._persistentHash_1({ domain_sep:
                                      new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 122, 115, 119, 97, 112, 45, 99, 99, 91, 118, 49, 93]),
                                    info: coin_0,
                                    dataType: recipient_0.is_left,
                                    data:
                                      recipient_0.is_left ?
                                      recipient_0.left.bytes :
                                      recipient_0.right.bytes });
  }
  _sendUnshielded_0(context, partialProofData, color_0, amount_0, recipient_0) {
    const tmp_0 = this._left_0(color_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(7n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_0),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(amount_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    const tmp_1 = this._left_0(color_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(8n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.alignedConcat(
                                                                                              { value: _descriptor_12.toValue(tmp_1),
                                                                                                alignment: _descriptor_12.alignment() },
                                                                                              { value: _descriptor_13.toValue(recipient_0),
                                                                                                alignment: _descriptor_13.alignment() }
                                                                                            )).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(amount_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    if (recipient_0.is_left
        &&
        this._equal_1(recipient_0.left.bytes,
                      _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 2 } },
                                                                                 { idx: { cached: true,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_11.toValue(0n),
                                                                                                            alignment: _descriptor_11.alignment() } }] } },
                                                                                 { popeq: { cached: true,
                                                                                            result: undefined } }]).value).bytes))
    {
      const tmp_2 = this._left_0(color_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_11.toValue(6n),
                                                                    alignment: _descriptor_11.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_2),
                                                                                                alignment: _descriptor_12.alignment() }).encode() } },
                                         { dup: { n: 1 } },
                                         { dup: { n: 1 } },
                                         'member',
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(amount_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { swap: { n: 0 } },
                                         'neg',
                                         { branch: { skip: 4 } },
                                         { dup: { n: 2 } },
                                         { dup: { n: 2 } },
                                         { idx: { cached: true,
                                                  pushPath: false,
                                                  path: [ { tag: 'stack' }] } },
                                         'add',
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
    }
    return [];
  }
  _receiveUnshielded_0(context, partialProofData, color_0, amount_0) {
    const tmp_0 = this._left_0(color_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(6n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_0),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(amount_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    return [];
  }
  _unshieldedBalanceLt_0(context, partialProofData, color_0, amount_0) {
    const tmp_0 = this._left_0(color_0);
    return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 2 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_11.toValue(5n),
                                                                                                 alignment: _descriptor_11.alignment() } }] } },
                                                                      { dup: { n: 0 } },
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_0),
                                                                                                                             alignment: _descriptor_12.alignment() }).encode() } },
                                                                      'member',
                                                                      { branch: { skip: 3 } },
                                                                      'pop',
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                                                             alignment: _descriptor_0.alignment() }).encode() } },
                                                                      { jmp: { skip: 1 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_12.toValue(tmp_0),
                                                                                                 alignment: _descriptor_12.alignment() } }] } },
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(amount_0),
                                                                                                                             alignment: _descriptor_0.alignment() }).encode() } },
                                                                      'lt',
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  _unshieldedBalanceGte_0(context, partialProofData, color_0, amount_0) {
    return !this._unshieldedBalanceLt_0(context,
                                        partialProofData,
                                        color_0,
                                        amount_0);
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_11, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_9, value_0);
    return result_0;
  }
  _persistentCommit_0(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_10,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _ownPublicKey_0(context, partialProofData) {
    const result_0 = __compactRuntime.ownPublicKey(context);
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_6.toValue(result_0),
      alignment: _descriptor_6.alignment()
    });
    return result_0;
  }
  _createZswapOutput_0(context, partialProofData, coin_0, recipient_0) {
    const result_0 = __compactRuntime.createZswapOutput(context,
                                                        coin_0,
                                                        recipient_0);
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _coinNonce_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.coinNonce(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('coinNonce',
                                 'return value',
                                 'akad.compact line 100 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_1.toValue(result_0),
      alignment: _descriptor_1.alignment()
    });
    return result_0;
  }
  _spentCoin_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.spentCoin(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && result_0.nonce.buffer instanceof ArrayBuffer && result_0.nonce.BYTES_PER_ELEMENT === 1 && result_0.nonce.length === 32 && result_0.color.buffer instanceof ArrayBuffer && result_0.color.BYTES_PER_ELEMENT === 1 && result_0.color.length === 32 && typeof(result_0.value) === 'bigint' && result_0.value >= 0n && result_0.value <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('spentCoin',
                                 'return value',
                                 'akad.compact line 101 char 1',
                                 'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_5.toValue(result_0),
      alignment: _descriptor_5.alignment()
    });
    return result_0;
  }
  _callerKey_0(context, partialProofData) {
    return this._ownPublicKey_0(context, partialProofData).bytes;
  }
  _poolKey_0() { return this._persistentHash_0(7n); }
  _faucetKey_0() { return this._persistentHash_0(11n); }
  _currentTokenColor_0(context, partialProofData) {
    const domainSep_0 = this._persistentHash_0(42n);
    return this._tokenType_0(domainSep_0,
                             _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 2 } },
                                                                                        { idx: { cached: true,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_11.toValue(0n),
                                                                                                                   alignment: _descriptor_11.alignment() } }] } },
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value));
  }
  _currentNightColor_0(context, partialProofData) {
    const domainSep_0 = this._persistentHash_0(43n);
    return this._tokenType_0(domainSep_0,
                             _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 2 } },
                                                                                        { idx: { cached: true,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_11.toValue(0n),
                                                                                                                   alignment: _descriptor_11.alignment() } }] } },
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value));
  }
  _balanceOf_0(context, partialProofData, account_0) {
    if (!_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_11.toValue(0n),
                                                                                               alignment: _descriptor_11.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(account_0),
                                                                                                                           alignment: _descriptor_1.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      return 0n;
    } else {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_11.toValue(0n),
                                                                                                   alignment: _descriptor_11.alignment() } }] } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(account_0),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  }
  _hasClaimedFaucet_0(context, partialProofData, account_0) {
    if (!_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_11.toValue(8n),
                                                                                               alignment: _descriptor_11.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(account_0),
                                                                                                                           alignment: _descriptor_1.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      return false;
    } else {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_11.toValue(8n),
                                                                                                   alignment: _descriptor_11.alignment() } }] } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(account_0),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  }
  _transfer_0(context, partialProofData, to_0, amount_0) {
    const sender_0 = this._callerKey_0(context, partialProofData);
    const senderBalance_0 = this._balanceOf_0(context,
                                              partialProofData,
                                              sender_0);
    __compactRuntime.assert(senderBalance_0 >= amount_0, 'insufficient balance');
    const newSenderBalance_0 = (__compactRuntime.assert(senderBalance_0
                                                        >=
                                                        amount_0,
                                                        'result of subtraction would be negative'),
                                senderBalance_0 - amount_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(sender_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newSenderBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const recipientBalance_0 = this._balanceOf_0(context, partialProofData, to_0);
    const newRecipientBalance_0 = ((t1) => {
                                    if (t1 > 340282366920938463463374607431768211455n) {
                                      throw new __compactRuntime.CompactError('akad.compact line 273 char 42: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                                    }
                                    return t1;
                                  })(recipientBalance_0 + amount_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(to_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newRecipientBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _claimFaucet_0(context, partialProofData) {
    const caller_0 = this._callerKey_0(context, partialProofData);
    __compactRuntime.assert(!this._hasClaimedFaucet_0(context,
                                                      partialProofData,
                                                      caller_0),
                            'this wallet has already claimed from the faucet');
    const faucet_0 = this._faucetKey_0();
    const faucetBalance_0 = this._balanceOf_0(context,
                                              partialProofData,
                                              faucet_0);
    __compactRuntime.assert(faucetBalance_0 >= 50000000n,
                            'faucet is empty, ask the deployer to top it up');
    const newFaucetBalance_0 = (__compactRuntime.assert(faucetBalance_0
                                                        >=
                                                        50000000n,
                                                        'result of subtraction would be negative'),
                                faucetBalance_0 - 50000000n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(faucet_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newFaucetBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const callerBalance_0 = this._balanceOf_0(context,
                                              partialProofData,
                                              caller_0);
    const newCallerBalance_0 = ((t1) => {
                                 if (t1 > 340282366920938463463374607431768211455n) {
                                   throw new __compactRuntime.CompactError('akad.compact line 297 char 39: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                                 }
                                 return t1;
                               })(callerBalance_0 + 50000000n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(caller_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newCallerBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(8n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(caller_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(true),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _recordTokenColor_0(context, partialProofData) {
    const tmp_0 = this._currentTokenColor_0(context, partialProofData);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(2n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = this._currentNightColor_0(context, partialProofData);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(6n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_1),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _wrap_0(context, partialProofData, amount_0) {
    const caller_0 = this._callerKey_0(context, partialProofData);
    const balance_0 = this._balanceOf_0(context, partialProofData, caller_0);
    __compactRuntime.assert(balance_0 >= amount_0,
                            'insufficient balance to wrap');
    __compactRuntime.assert(amount_0 > 0n, 'amount must be positive');
    __compactRuntime.assert(amount_0 <= 18446744073709551615n,
                            'amount exceeds shielded mint bound (Uint<64>)');
    const newBalance_0 = (__compactRuntime.assert(balance_0 >= amount_0,
                                                  'result of subtraction would be negative'),
                          balance_0 - amount_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(caller_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const domainSep_0 = this._persistentHash_0(42n);
    const value_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 347 char 36: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(amount_0);
    const recipient_0 = this._left_1(this._ownPublicKey_0(context,
                                                          partialProofData));
    const coin_0 = this._mintShieldedToken_0(context,
                                             partialProofData,
                                             domainSep_0,
                                             value_0,
                                             this._coinNonce_0(context,
                                                               partialProofData),
                                             recipient_0);
    return [];
  }
  _unwrap_0(context, partialProofData) {
    const coin_0 = this._spentCoin_0(context, partialProofData);
    __compactRuntime.assert(this._equal_2(coin_0.color,
                                          this._currentTokenColor_0(context,
                                                                    partialProofData)),
                            'wrong token color');
    this._receiveShielded_0(context, partialProofData, coin_0);
    const caller_0 = this._callerKey_0(context, partialProofData);
    const balance_0 = this._balanceOf_0(context, partialProofData, caller_0);
    const amount_0 = coin_0.value;
    const newBalance_0 = ((t1) => {
                           if (t1 > 340282366920938463463374607431768211455n) {
                             throw new __compactRuntime.CompactError('akad.compact line 369 char 33: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                           }
                           return t1;
                         })(balance_0 + amount_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(caller_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
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
                                                                                             value: { value: _descriptor_11.toValue(4n),
                                                                                                      alignment: _descriptor_11.alignment() } }] } },
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
                                                                                             value: { value: _descriptor_11.toValue(5n),
                                                                                                      alignment: _descriptor_11.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(this._equal_3(x_0, 0n) && this._equal_4(y_0, 0n),
                            'liquidity already seeded');
    __compactRuntime.assert(amountAKD_0 > 0n && amountNight_0 > 0n,
                            'amounts must be positive');
    __compactRuntime.assert(amountAKD_0 <= 4000000000n,
                            'amountAKD exceeds safe bound');
    __compactRuntime.assert(amountNight_0 <= 4000000000n,
                            'amountNight exceeds safe bound');
    const builder_0 = this._callerKey_0(context, partialProofData);
    const builderBalance_0 = this._balanceOf_0(context,
                                               partialProofData,
                                               builder_0);
    __compactRuntime.assert(builderBalance_0 >= amountAKD_0,
                            'insufficient AKD balance to seed pool');
    const newBuilderBalance_0 = (__compactRuntime.assert(builderBalance_0
                                                         >=
                                                         amountAKD_0,
                                                         'result of subtraction would be negative'),
                                 builderBalance_0 - amountAKD_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(builder_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newBuilderBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const pool_0 = this._poolKey_0();
    const poolBalance_0 = this._balanceOf_0(context, partialProofData, pool_0);
    const newPoolBalance_0 = ((t1) => {
                               if (t1 > 340282366920938463463374607431768211455n) {
                                 throw new __compactRuntime.CompactError('akad.compact line 400 char 37: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                               }
                               return t1;
                             })(poolBalance_0 + amountAKD_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(pool_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newPoolBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    this._receiveUnshielded_0(context,
                              partialProofData,
                              this._nativeToken_0(),
                              amountNight_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(4n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(amountAKD_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(5n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(amountNight_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _swapAkdToNight_0(context, partialProofData, dx_0, dy_0, minOut_0, recipient_0)
  {
    const x_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_11.toValue(4n),
                                                                                                      alignment: _descriptor_11.alignment() } }] } },
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
                                                                                             value: { value: _descriptor_11.toValue(5n),
                                                                                                      alignment: _descriptor_11.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(x_0 > 0n && y_0 > 0n, 'pool not initialized');
    __compactRuntime.assert(dx_0 > 0n, 'amount must be positive');
    __compactRuntime.assert(dy_0 > 0n, 'output rounds to zero');
    __compactRuntime.assert(dy_0 >= minOut_0, 'slippage: insufficient output');
    __compactRuntime.assert(dy_0 < y_0, 'cannot drain full reserve');
    let t_0;
    __compactRuntime.assert((t_0 = x_0 + dx_0, t_0 <= 4000000000n),
                            'reserveAKD exceeds safe bound');
    __compactRuntime.assert(y_0 <= 4000000000n,
                            'reserveNight exceeds safe bound');
    __compactRuntime.assert(this._unshieldedBalanceGte_0(context,
                                                         partialProofData,
                                                         this._nativeToken_0(),
                                                         dy_0),
                            'pool has insufficient tNIGHT custody for this swap');
    const xBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 433 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(x_0);
    const dxBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 434 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dx_0);
    const yBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 435 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(y_0);
    const dyBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 436 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
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
    const trader_0 = this._callerKey_0(context, partialProofData);
    const traderBalance_0 = this._balanceOf_0(context,
                                              partialProofData,
                                              trader_0);
    __compactRuntime.assert(traderBalance_0 >= dx_0,
                            'insufficient AKD balance for swap');
    const newTraderBalance_0 = (__compactRuntime.assert(traderBalance_0 >= dx_0,
                                                        'result of subtraction would be negative'),
                                traderBalance_0 - dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(trader_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newTraderBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const pool_0 = this._poolKey_0();
    const poolBalance_0 = this._balanceOf_0(context, partialProofData, pool_0);
    const newPoolBalance_0 = ((t1) => {
                               if (t1 > 340282366920938463463374607431768211455n) {
                                 throw new __compactRuntime.CompactError('akad.compact line 449 char 37: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                               }
                               return t1;
                             })(poolBalance_0 + dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(pool_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newPoolBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = ((t1) => {
                    if (t1 > 340282366920938463463374607431768211455n) {
                      throw new __compactRuntime.CompactError('akad.compact line 452 char 29: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(x_0 + dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(4n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(5n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    this._sendUnshielded_0(context,
                           partialProofData,
                           this._nativeToken_0(),
                           dy_0,
                           this._right_0(recipient_0));
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
                                                                                             value: { value: _descriptor_11.toValue(5n),
                                                                                                      alignment: _descriptor_11.alignment() } }] } },
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
                                                                                             value: { value: _descriptor_11.toValue(4n),
                                                                                                      alignment: _descriptor_11.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(x_0 > 0n && y_0 > 0n, 'pool not initialized');
    __compactRuntime.assert(dx_0 > 0n, 'amount must be positive');
    __compactRuntime.assert(dy_0 > 0n, 'output rounds to zero');
    __compactRuntime.assert(dy_0 >= minOut_0, 'slippage: insufficient output');
    __compactRuntime.assert(dy_0 < y_0, 'cannot drain full reserve');
    let t_0;
    __compactRuntime.assert((t_0 = x_0 + dx_0, t_0 <= 4000000000n),
                            'reserveNight exceeds safe bound');
    __compactRuntime.assert(y_0 <= 4000000000n, 'reserveAKD exceeds safe bound');
    const xBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 473 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(x_0);
    const dxBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 474 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dx_0);
    const yBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 475 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(y_0);
    const dyBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 476 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
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
    const pool_0 = this._poolKey_0();
    const poolBalance_0 = this._balanceOf_0(context, partialProofData, pool_0);
    __compactRuntime.assert(poolBalance_0 >= dy_0,
                            'pool has insufficient AKD custody for this swap');
    this._receiveUnshielded_0(context,
                              partialProofData,
                              this._nativeToken_0(),
                              dx_0);
    const newPoolBalance_0 = (__compactRuntime.assert(poolBalance_0 >= dy_0,
                                                      'result of subtraction would be negative'),
                              poolBalance_0 - dy_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(pool_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newPoolBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const trader_0 = this._callerKey_0(context, partialProofData);
    const traderBalance_0 = this._balanceOf_0(context,
                                              partialProofData,
                                              trader_0);
    const newTraderBalance_0 = ((t1) => {
                                 if (t1 > 340282366920938463463374607431768211455n) {
                                   throw new __compactRuntime.CompactError('akad.compact line 496 char 39: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                                 }
                                 return t1;
                               })(traderBalance_0 + dy_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(trader_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newTraderBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = ((t1) => {
                    if (t1 > 340282366920938463463374607431768211455n) {
                      throw new __compactRuntime.CompactError('akad.compact line 499 char 31: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(x_0 + dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(5n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(4n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _unwrapNight_0(context, partialProofData, recipient_0) {
    const coin_0 = this._spentCoin_0(context, partialProofData);
    __compactRuntime.assert(this._equal_5(coin_0.color,
                                          this._currentNightColor_0(context,
                                                                    partialProofData)),
                            'wrong token color');
    const amount_0 = coin_0.value;
    __compactRuntime.assert(amount_0 > 0n, 'amount must be positive');
    const supply_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_11.toValue(7n),
                                                                                                           alignment: _descriptor_11.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value);
    __compactRuntime.assert(supply_0 >= amount_0,
                            'sNIGHT supply accounting underflow');
    __compactRuntime.assert(this._unshieldedBalanceGte_0(context,
                                                         partialProofData,
                                                         this._nativeToken_0(),
                                                         amount_0),
                            'contract has insufficient tNIGHT custody to redeem this coin');
    this._receiveShielded_0(context, partialProofData, coin_0);
    const tmp_0 = (__compactRuntime.assert(supply_0 >= amount_0,
                                           'result of subtraction would be negative'),
                   supply_0 - amount_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(7n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    this._sendUnshielded_0(context,
                           partialProofData,
                           this._nativeToken_0(),
                           amount_0,
                           this._right_0(recipient_0));
    return [];
  }
  _shieldedSwapAkdToNight_0(context, partialProofData, dy_0, minOut_0) {
    const coin_0 = this._spentCoin_0(context, partialProofData);
    __compactRuntime.assert(this._equal_6(coin_0.color,
                                          this._currentTokenColor_0(context,
                                                                    partialProofData)),
                            'wrong token color');
    const dx_0 = coin_0.value;
    __compactRuntime.assert(dx_0 > 0n, 'amount must be positive');
    const x_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_11.toValue(4n),
                                                                                                      alignment: _descriptor_11.alignment() } }] } },
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
                                                                                             value: { value: _descriptor_11.toValue(5n),
                                                                                                      alignment: _descriptor_11.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(x_0 > 0n && y_0 > 0n, 'pool not initialized');
    __compactRuntime.assert(dy_0 > 0n, 'output rounds to zero');
    __compactRuntime.assert(dy_0 >= minOut_0, 'slippage: insufficient output');
    __compactRuntime.assert(dy_0 < y_0, 'cannot drain full reserve');
    let t_0;
    __compactRuntime.assert((t_0 = x_0 + dx_0, t_0 <= 4000000000n),
                            'reserveAKD exceeds safe bound');
    __compactRuntime.assert(y_0 <= 4000000000n,
                            'reserveNight exceeds safe bound');
    const xBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 593 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(x_0);
    const dxBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 594 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dx_0);
    const yBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 595 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(y_0);
    const dyBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 596 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
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
    this._receiveShielded_0(context, partialProofData, coin_0);
    const pool_0 = this._poolKey_0();
    const poolBalance_0 = this._balanceOf_0(context, partialProofData, pool_0);
    const newPoolBalance_0 = ((t1) => {
                               if (t1 > 340282366920938463463374607431768211455n) {
                                 throw new __compactRuntime.CompactError('akad.compact line 604 char 37: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                               }
                               return t1;
                             })(poolBalance_0 + dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(pool_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newPoolBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = ((t1) => {
                    if (t1 > 340282366920938463463374607431768211455n) {
                      throw new __compactRuntime.CompactError('akad.compact line 609 char 29: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(x_0 + dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(4n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(5n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const supply_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_11.toValue(7n),
                                                                                                           alignment: _descriptor_11.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value);
    const tmp_2 = ((t1) => {
                    if (t1 > 340282366920938463463374607431768211455n) {
                      throw new __compactRuntime.CompactError('akad.compact line 615 char 31: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(supply_0 + dy_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(7n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const domainSep_0 = this._persistentHash_0(43n);
    const value_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 619 char 36: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dy_0);
    const out_0 = this._mintShieldedToken_0(context,
                                            partialProofData,
                                            domainSep_0,
                                            value_0,
                                            this._coinNonce_0(context,
                                                              partialProofData),
                                            this._left_1(this._ownPublicKey_0(context,
                                                                              partialProofData)));
    return [];
  }
  _shieldedSwapNightToAkd_0(context, partialProofData, dy_0, minOut_0) {
    const coin_0 = this._spentCoin_0(context, partialProofData);
    __compactRuntime.assert(this._equal_7(coin_0.color,
                                          this._currentNightColor_0(context,
                                                                    partialProofData)),
                            'wrong token color');
    const dx_0 = coin_0.value;
    __compactRuntime.assert(dx_0 > 0n, 'amount must be positive');
    const x_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_11.toValue(5n),
                                                                                                      alignment: _descriptor_11.alignment() } }] } },
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
                                                                                             value: { value: _descriptor_11.toValue(4n),
                                                                                                      alignment: _descriptor_11.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(x_0 > 0n && y_0 > 0n, 'pool not initialized');
    __compactRuntime.assert(dy_0 > 0n, 'output rounds to zero');
    __compactRuntime.assert(dy_0 >= minOut_0, 'slippage: insufficient output');
    __compactRuntime.assert(dy_0 < y_0, 'cannot drain full reserve');
    let t_0;
    __compactRuntime.assert((t_0 = x_0 + dx_0, t_0 <= 4000000000n),
                            'reserveNight exceeds safe bound');
    __compactRuntime.assert(y_0 <= 4000000000n, 'reserveAKD exceeds safe bound');
    const xBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 641 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(x_0);
    const dxBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 642 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dx_0);
    const yBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 643 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(y_0);
    const dyBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 644 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
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
    const pool_0 = this._poolKey_0();
    const poolBalance_0 = this._balanceOf_0(context, partialProofData, pool_0);
    __compactRuntime.assert(poolBalance_0 >= dy_0,
                            'pool has insufficient AKD custody for this swap');
    const supply_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_11.toValue(7n),
                                                                                                           alignment: _descriptor_11.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value);
    __compactRuntime.assert(supply_0 >= dx_0,
                            'sNIGHT supply accounting underflow');
    this._receiveShielded_0(context, partialProofData, coin_0);
    const tmp_0 = (__compactRuntime.assert(supply_0 >= dx_0,
                                           'result of subtraction would be negative'),
                   supply_0 - dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(7n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const newPoolBalance_0 = (__compactRuntime.assert(poolBalance_0 >= dy_0,
                                                      'result of subtraction would be negative'),
                              poolBalance_0 - dy_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(0n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(pool_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newPoolBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_1 = ((t1) => {
                    if (t1 > 340282366920938463463374607431768211455n) {
                      throw new __compactRuntime.CompactError('akad.compact line 664 char 31: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(x_0 + dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(5n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_2 = (__compactRuntime.assert(y_0 >= dy_0,
                                           'result of subtraction would be negative'),
                   y_0 - dy_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(4n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const domainSep_0 = this._persistentHash_0(42n);
    const value_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 668 char 36: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dy_0);
    const out_0 = this._mintShieldedToken_0(context,
                                            partialProofData,
                                            domainSep_0,
                                            value_0,
                                            this._coinNonce_0(context,
                                                              partialProofData),
                                            this._left_1(this._ownPublicKey_0(context,
                                                                              partialProofData)));
    return [];
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_5(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_6(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_7(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
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
    balances: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_11.toValue(0n),
                                                                                                     alignment: _descriptor_11.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_14.toValue(0n),
                                                                                                                                 alignment: _descriptor_14.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_14.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_11.toValue(0n),
                                                                                                      alignment: _descriptor_11.alignment() } }] } },
                                                                           'size',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'akad.compact line 104 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_11.toValue(0n),
                                                                                                     alignment: _descriptor_11.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(key_0),
                                                                                                                                 alignment: _descriptor_1.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'akad.compact line 104 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_11.toValue(0n),
                                                                                                     alignment: _descriptor_11.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(key_0),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[0];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_1.fromValue(key.value),      _descriptor_0.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get totalSupply() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_11.toValue(1n),
                                                                                                   alignment: _descriptor_11.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get tokenColor() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_11.toValue(2n),
                                                                                                   alignment: _descriptor_11.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get faucetAddress() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_11.toValue(3n),
                                                                                                   alignment: _descriptor_11.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get reserveAKD() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_11.toValue(4n),
                                                                                                   alignment: _descriptor_11.alignment() } }] } },
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
                                                                                          value: { value: _descriptor_11.toValue(5n),
                                                                                                   alignment: _descriptor_11.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get sNightColor() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_11.toValue(6n),
                                                                                                   alignment: _descriptor_11.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get sNightSupply() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_11.toValue(7n),
                                                                                                   alignment: _descriptor_11.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    faucetClaimed: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_11.toValue(8n),
                                                                                                     alignment: _descriptor_11.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_14.toValue(0n),
                                                                                                                                 alignment: _descriptor_14.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_14.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_11.toValue(8n),
                                                                                                      alignment: _descriptor_11.alignment() } }] } },
                                                                           'size',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'akad.compact line 162 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_11.toValue(8n),
                                                                                                     alignment: _descriptor_11.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(key_0),
                                                                                                                                 alignment: _descriptor_1.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'akad.compact line 162 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_11.toValue(8n),
                                                                                                     alignment: _descriptor_11.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(key_0),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[8];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_1.fromValue(key.value),      _descriptor_3.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  coinNonce: (...args) => undefined, spentCoin: (...args) => undefined
});
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
