import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

const _descriptor_1 = new __compactRuntime.CompactTypeBytes(32);

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

const _descriptor_2 = new _ShieldedCoinInfo_0();

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

const _descriptor_5 = new _ZswapCoinPublicKey_0();

class _Either_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_5.alignment().concat(_descriptor_4.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_3.fromValue(value_0),
      left: _descriptor_5.fromValue(value_0),
      right: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.is_left).concat(_descriptor_5.toValue(value_0.left).concat(_descriptor_4.toValue(value_0.right)));
  }
}

const _descriptor_6 = new _Either_0();

const _descriptor_7 = new __compactRuntime.CompactTypeVector(2, _descriptor_1);

const _descriptor_8 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_9 = new __compactRuntime.CompactTypeBytes(21);

class _CoinPreimage_0 {
  alignment() {
    return _descriptor_9.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_1.alignment())));
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_9.fromValue(value_0),
      info: _descriptor_2.fromValue(value_0),
      dataType: _descriptor_3.fromValue(value_0),
      data: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_9.toValue(value_0.domain_sep).concat(_descriptor_2.toValue(value_0.info).concat(_descriptor_3.toValue(value_0.dataType).concat(_descriptor_1.toValue(value_0.data))));
  }
}

const _descriptor_10 = new _CoinPreimage_0();

const _descriptor_11 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

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
      init: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`init: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('init',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 107 char 1',
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
        const result_0 = this._init_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
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
                                     'akad.compact line 123 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(to_0.buffer instanceof ArrayBuffer && to_0.BYTES_PER_ELEMENT === 1 && to_0.length === 32)) {
          __compactRuntime.typeError('transfer',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 123 char 1',
                                     'Bytes<32>',
                                     to_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('transfer',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 123 char 1',
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
                                     'akad.compact line 145 char 1',
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
      akdColor: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`akdColor: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('akdColor',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 166 char 1',
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
        const result_0 = this._akdColor_0(context, partialProofData);
        partialProofData.output = { value: _descriptor_1.toValue(result_0), alignment: _descriptor_1.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      wrap: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`wrap: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amount_0 = args_1[1];
        const nonce_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('wrap',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 173 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('wrap',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 173 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
          __compactRuntime.typeError('wrap',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 173 char 1',
                                     'Bytes<32>',
                                     nonce_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(amount_0).concat(_descriptor_1.toValue(nonce_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_1.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._wrap_0(context,
                                      partialProofData,
                                      amount_0,
                                      nonce_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      unwrap: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`unwrap: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const coin_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('unwrap',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 193 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('unwrap',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 193 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     coin_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(coin_0),
            alignment: _descriptor_2.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._unwrap_0(context, partialProofData, coin_0);
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
                                     'akad.compact line 209 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amountAKD_0) === 'bigint' && amountAKD_0 >= 0n && amountAKD_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 209 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amountAKD_0)
        }
        if (!(typeof(amountNight_0) === 'bigint' && amountNight_0 >= 0n && amountNight_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 209 char 1',
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
                                     'akad.compact line 242 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(dx_0) === 'bigint' && dx_0 >= 0n && dx_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapAkdToNight',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 242 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dx_0)
        }
        if (!(typeof(dy_0) === 'bigint' && dy_0 >= 0n && dy_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapAkdToNight',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 242 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dy_0)
        }
        if (!(typeof(minOut_0) === 'bigint' && minOut_0 >= 0n && minOut_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapAkdToNight',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'akad.compact line 242 char 1',
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
                                     'akad.compact line 281 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(dx_0) === 'bigint' && dx_0 >= 0n && dx_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapNightToAkd',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 281 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dx_0)
        }
        if (!(typeof(dy_0) === 'bigint' && dy_0 >= 0n && dy_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapNightToAkd',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 281 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dy_0)
        }
        if (!(typeof(minOut_0) === 'bigint' && minOut_0 >= 0n && minOut_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swapNightToAkd',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'akad.compact line 281 char 1',
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
      privateSwapAkdToNight: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`privateSwapAkdToNight: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const coin_0 = args_1[1];
        const dy_0 = args_1[2];
        const minOut_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('privateSwapAkdToNight',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 325 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('privateSwapAkdToNight',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 325 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     coin_0)
        }
        if (!(typeof(dy_0) === 'bigint' && dy_0 >= 0n && dy_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('privateSwapAkdToNight',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 325 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dy_0)
        }
        if (!(typeof(minOut_0) === 'bigint' && minOut_0 >= 0n && minOut_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('privateSwapAkdToNight',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'akad.compact line 325 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     minOut_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(coin_0).concat(_descriptor_0.toValue(dy_0).concat(_descriptor_0.toValue(minOut_0))),
            alignment: _descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._privateSwapAkdToNight_0(context,
                                                       partialProofData,
                                                       coin_0,
                                                       dy_0,
                                                       minOut_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      privateSwapNightToAkd: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`privateSwapNightToAkd: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const dx_0 = args_1[1];
        const dy_0 = args_1[2];
        const minOut_0 = args_1[3];
        const nonce_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('privateSwapNightToAkd',
                                     'argument 1 (as invoked from Typescript)',
                                     'akad.compact line 368 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(dx_0) === 'bigint' && dx_0 >= 0n && dx_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('privateSwapNightToAkd',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'akad.compact line 368 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dx_0)
        }
        if (!(typeof(dy_0) === 'bigint' && dy_0 >= 0n && dy_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('privateSwapNightToAkd',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'akad.compact line 368 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     dy_0)
        }
        if (!(typeof(minOut_0) === 'bigint' && minOut_0 >= 0n && minOut_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('privateSwapNightToAkd',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'akad.compact line 368 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     minOut_0)
        }
        if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
          __compactRuntime.typeError('privateSwapNightToAkd',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'akad.compact line 368 char 1',
                                     'Bytes<32>',
                                     nonce_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(dx_0).concat(_descriptor_0.toValue(dy_0).concat(_descriptor_0.toValue(minOut_0).concat(_descriptor_1.toValue(nonce_0)))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_1.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._privateSwapNightToAkd_0(context,
                                                       partialProofData,
                                                       dx_0,
                                                       dy_0,
                                                       minOut_0,
                                                       nonce_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      init: this.circuits.init,
      transfer: this.circuits.transfer,
      claimFaucet: this.circuits.claimFaucet,
      akdColor: this.circuits.akdColor,
      wrap: this.circuits.wrap,
      unwrap: this.circuits.unwrap,
      addLiquidity: this.circuits.addLiquidity,
      swapAkdToNight: this.circuits.swapAkdToNight,
      swapNightToAkd: this.circuits.swapNightToAkd,
      privateSwapAkdToNight: this.circuits.privateSwapAkdToNight,
      privateSwapNightToAkd: this.circuits.privateSwapNightToAkd
    };
    this.provableCircuits = {
      init: this.circuits.init,
      transfer: this.circuits.transfer,
      claimFaucet: this.circuits.claimFaucet,
      akdColor: this.circuits.akdColor,
      wrap: this.circuits.wrap,
      unwrap: this.circuits.unwrap,
      addLiquidity: this.circuits.addLiquidity,
      swapAkdToNight: this.circuits.swapAkdToNight,
      swapNightToAkd: this.circuits.swapNightToAkd,
      privateSwapAkdToNight: this.circuits.privateSwapAkdToNight,
      privateSwapNightToAkd: this.circuits.privateSwapNightToAkd
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
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('init', new __compactRuntime.ContractOperation());
    state_0.setOperation('transfer', new __compactRuntime.ContractOperation());
    state_0.setOperation('claimFaucet', new __compactRuntime.ContractOperation());
    state_0.setOperation('akdColor', new __compactRuntime.ContractOperation());
    state_0.setOperation('wrap', new __compactRuntime.ContractOperation());
    state_0.setOperation('unwrap', new __compactRuntime.ContractOperation());
    state_0.setOperation('addLiquidity', new __compactRuntime.ContractOperation());
    state_0.setOperation('swapAkdToNight', new __compactRuntime.ContractOperation());
    state_0.setOperation('swapNightToAkd', new __compactRuntime.ContractOperation());
    state_0.setOperation('privateSwapAkdToNight', new __compactRuntime.ContractOperation());
    state_0.setOperation('privateSwapNightToAkd', new __compactRuntime.ContractOperation());
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(1n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(2n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(3n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(4n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(5n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(6n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _left_0(value_0) {
    return { is_left: true, left: value_0, right: { bytes: new Uint8Array(32) } };
  }
  _right_0(value_0) {
    return { is_left: false, left: { bytes: new Uint8Array(32) }, right: value_0 };
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
                                                                                                                      value: { value: _descriptor_8.toValue(0n),
                                                                                                                               alignment: _descriptor_8.alignment() } }] } },
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
                                                         value: { value: _descriptor_8.toValue(4n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(domain_sep_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(value_0),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_8.toValue(2n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                                                                                                   value: { value: _descriptor_8.toValue(0n),
                                                                                                            alignment: _descriptor_8.alignment() } }] } },
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
                                                           value: { value: _descriptor_8.toValue(1n),
                                                                    alignment: _descriptor_8.alignment() } }] } },
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
    const recipient_0 = this._right_0(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                partialProofData,
                                                                                                [
                                                                                                 { dup: { n: 2 } },
                                                                                                 { idx: { cached: true,
                                                                                                          pushPath: false,
                                                                                                          path: [
                                                                                                                 { tag: 'value',
                                                                                                                   value: { value: _descriptor_8.toValue(0n),
                                                                                                                            alignment: _descriptor_8.alignment() } }] } },
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
                                                         value: { value: _descriptor_8.toValue(1n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_8, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_10, value_0);
    return result_0;
  }
  _persistentCommit_0(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_7,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _ownPublicKey_0(context, partialProofData) {
    const result_0 = __compactRuntime.ownPublicKey(context);
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_5.toValue(result_0),
      alignment: _descriptor_5.alignment()
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
  _callerKey_0(context, partialProofData) {
    return this._ownPublicKey_0(context, partialProofData).bytes;
  }
  _poolKey_0() { return this._persistentHash_0(7n); }
  _faucetKey_0() { return this._persistentHash_0(11n); }
  _balanceOf_0(context, partialProofData, account_0) {
    if (!_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_8.toValue(0n),
                                                                                               alignment: _descriptor_8.alignment() } }] } },
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
                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
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
                                                                                      value: { value: _descriptor_8.toValue(6n),
                                                                                               alignment: _descriptor_8.alignment() } }] } },
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
                                                                                          value: { value: _descriptor_8.toValue(6n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
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
  _init_0(context, partialProofData) {
    __compactRuntime.assert(this._equal_1(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_8.toValue(1n),
                                                                                                                                alignment: _descriptor_8.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          0n),
                            'already initialized');
    const owner_0 = this._callerKey_0(context, partialProofData);
    const tmp_0 = 1000000000000n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(1n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const domainSep_0 = this._persistentHash_0(42n);
    const color_0 = this._tokenType_0(domainSep_0,
                                      _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                partialProofData,
                                                                                                [
                                                                                                 { dup: { n: 2 } },
                                                                                                 { idx: { cached: true,
                                                                                                          pushPath: false,
                                                                                                          path: [
                                                                                                                 { tag: 'value',
                                                                                                                   value: { value: _descriptor_8.toValue(0n),
                                                                                                                            alignment: _descriptor_8.alignment() } }] } },
                                                                                                 { popeq: { cached: true,
                                                                                                            result: undefined } }]).value));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(2n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(color_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_2 = this._faucetKey_0();
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(3n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_2),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                                      throw new __compactRuntime.CompactError('akad.compact line 133 char 42: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                                   throw new __compactRuntime.CompactError('akad.compact line 157 char 39: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                                                         value: { value: _descriptor_8.toValue(6n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
  _akdColor_0(context, partialProofData) {
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
                                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value));
  }
  _wrap_0(context, partialProofData, amount_0, nonce_0) {
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                        throw new __compactRuntime.CompactError('akad.compact line 185 char 36: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(amount_0);
    const recipient_0 = this._left_0(this._ownPublicKey_0(context,
                                                          partialProofData));
    const coin_0 = this._mintShieldedToken_0(context,
                                             partialProofData,
                                             domainSep_0,
                                             value_0,
                                             nonce_0,
                                             recipient_0);
    return [];
  }
  _unwrap_0(context, partialProofData, coin_0) {
    __compactRuntime.assert(this._equal_2(coin_0.color,
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_8.toValue(2n),
                                                                                                                                alignment: _descriptor_8.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'wrong token color');
    this._receiveShielded_0(context, partialProofData, coin_0);
    const caller_0 = this._callerKey_0(context, partialProofData);
    const balance_0 = this._balanceOf_0(context, partialProofData, caller_0);
    const amount_0 = coin_0.value;
    const newBalance_0 = ((t1) => {
                           if (t1 > 340282366920938463463374607431768211455n) {
                             throw new __compactRuntime.CompactError('akad.compact line 200 char 33: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                                                                                             value: { value: _descriptor_8.toValue(4n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
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
                                                                                             value: { value: _descriptor_8.toValue(5n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                                 throw new __compactRuntime.CompactError('akad.compact line 231 char 37: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(pool_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newPoolBalance_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(4n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(amountAKD_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(5n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
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
                                                                                             value: { value: _descriptor_8.toValue(4n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
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
                                                                                             value: { value: _descriptor_8.toValue(5n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
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
    const xBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 254 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(x_0);
    const dxBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 255 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dx_0);
    const yBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 256 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(y_0);
    const dyBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 257 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                                 throw new __compactRuntime.CompactError('akad.compact line 270 char 37: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                      throw new __compactRuntime.CompactError('akad.compact line 273 char 29: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(x_0 + dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(4n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(5n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
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
                                                                                             value: { value: _descriptor_8.toValue(5n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
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
                                                                                             value: { value: _descriptor_8.toValue(4n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
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
                       throw new __compactRuntime.CompactError('akad.compact line 293 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(x_0);
    const dxBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 294 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dx_0);
    const yBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 295 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(y_0);
    const dyBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 296 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                                   throw new __compactRuntime.CompactError('akad.compact line 309 char 39: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                      throw new __compactRuntime.CompactError('akad.compact line 312 char 31: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(x_0 + dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(5n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(4n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _privateSwapAkdToNight_0(context, partialProofData, coin_0, dy_0, minOut_0) {
    __compactRuntime.assert(this._equal_5(coin_0.color,
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_8.toValue(2n),
                                                                                                                                alignment: _descriptor_8.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'wrong token color');
    this._receiveShielded_0(context, partialProofData, coin_0);
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
                                                                                             value: { value: _descriptor_8.toValue(4n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
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
                                                                                             value: { value: _descriptor_8.toValue(5n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
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
                       throw new __compactRuntime.CompactError('akad.compact line 342 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(x_0);
    const dxBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 343 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dx_0);
    const yBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 344 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(y_0);
    const dyBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 345 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
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
    const newPoolBalance_0 = ((t1) => {
                               if (t1 > 340282366920938463463374607431768211455n) {
                                 throw new __compactRuntime.CompactError('akad.compact line 351 char 37: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                      throw new __compactRuntime.CompactError('akad.compact line 354 char 29: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(x_0 + dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(4n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(5n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _privateSwapNightToAkd_0(context,
                           partialProofData,
                           dx_0,
                           dy_0,
                           minOut_0,
                           nonce_0)
  {
    const x_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(5n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
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
                                                                                             value: { value: _descriptor_8.toValue(4n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
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
                       throw new __compactRuntime.CompactError('akad.compact line 380 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(x_0);
    const dxBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 381 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dx_0);
    const yBig_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('akad.compact line 382 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(y_0);
    const dyBig_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 383 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
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
                                                         value: { value: _descriptor_8.toValue(0n),
                                                                  alignment: _descriptor_8.alignment() } }] } },
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
                      throw new __compactRuntime.CompactError('akad.compact line 394 char 31: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(x_0 + dx_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(5n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(4n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const domainSep_0 = this._persistentHash_0(42n);
    const value_0 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('akad.compact line 398 char 36: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(dy_0);
    const recipient_0 = this._left_0(this._ownPublicKey_0(context,
                                                          partialProofData));
    const coin_0 = this._mintShieldedToken_0(context,
                                             partialProofData,
                                             domainSep_0,
                                             value_0,
                                             nonce_0,
                                             recipient_0);
    return [];
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (x0 !== y0) { return false; }
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
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(0n),
                                                                                                                                 alignment: _descriptor_11.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(0n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
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
                                     'akad.compact line 36 char 1',
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
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
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
                                     'akad.compact line 36 char 1',
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
                                                                                            value: { value: _descriptor_8.toValue(0n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
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
                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
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
                                                                                          value: { value: _descriptor_8.toValue(2n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
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
                                                                                          value: { value: _descriptor_8.toValue(3n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
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
                                                                                          value: { value: _descriptor_8.toValue(4n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
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
                                                                                          value: { value: _descriptor_8.toValue(5n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
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
                                                                                            value: { value: _descriptor_8.toValue(6n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(0n),
                                                                                                                                 alignment: _descriptor_11.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_8.toValue(6n),
                                                                                                      alignment: _descriptor_8.alignment() } }] } },
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
                                     'akad.compact line 54 char 1',
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
                                                                                            value: { value: _descriptor_8.toValue(6n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
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
                                     'akad.compact line 54 char 1',
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
                                                                                            value: { value: _descriptor_8.toValue(6n),
                                                                                                     alignment: _descriptor_8.alignment() } }] } },
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
        const self_0 = state.asArray()[6];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_1.fromValue(key.value),      _descriptor_3.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
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
