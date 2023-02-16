import Web3 from 'web3';
import noble from 'noble-secp256k1';
import { Client } from '../client';
import { 
  GetMainKeypairByNostrParams, 
  GetRegisterSignContentParams,
  LoginByKeysParams,
  NostrOptions, 
  NostrKeyPairsType, 
  RegisterBySignParams 
} from '../types';

import { ByteArrayToHexString } from '../utils';

export class Nostr {
  relays: Array<string>;
  auther: string;
  appKey: string;
  web3: Web3;

  constructor(options: NostrOptions) {
    this.auther = options.auther;
    this.appKey = options.appKey;
    this.relays = options.relays;
    this.web3 = new Web3(Web3.givenProvider);
    this.init();
  }

  private init() {

  }

  // 1. 生成nostr的密钥对（账户）
  generateNostrKeyPair() {
    const privObject = noble.utils.randomPrivateKey();
    // const pubObject = noble.getPublicKey(privObject);
    // Schnorr signatures
    const rpub = noble.schnorr.getPublicKey(privObject);
    const privKey = ByteArrayToHexString(privObject);
    const pubKey = ByteArrayToHexString(rpub);
    return {
      PrivateKey: privKey,
      PublicKey: pubKey,
    };
  }
  // 2. 通过公钥生成address
  async generateKeys(keys?: NostrKeyPairsType) {
    let keypairs = keys;
    // 若用户不传公私钥，则自动生成
    if (!keypairs) {
      const { PublicKey, PrivateKey } = this.generateNostrKeyPair();
      keypairs = {
        PublicKey,
        PrivateKey
      };
    }
    const { address } = this.web3.eth.accounts.privateKeyToAccount(`0x${keypairs.PrivateKey}`);
    return {
      ...keypairs,
      did_value: address,
      did_type: 'nostr'
    };
  };

  // 3. 用户是否以注册
  async getUserInfo(did_value: string) {
    return await Client.register.getUserInfo({
      did_type: 'nostr',
      did_value,
    });
  }

  // 4. 获取 注册的签名内容
  async getRegisterSignContent(options: Omit<GetRegisterSignContentParams, 'didType'>) {
    return await Client.register.getRegisterSignContent({
      ...options,
      didType: 'nostr' as any
    });
  }

  // 5. 唤起签名
  sign(signContent: string, privateKey: string) {
    const { signature } = this.web3.eth.accounts.sign(signContent, `0x${privateKey}`);
    return {
      signature
    };
  };

  // 6. 获取主密钥对
  async getMainKeypair(options: GetMainKeypairByNostrParams) {
    const { password, did_value, privateKey } = options;
    const { signContent } = await Client.register.getMainKeypairSignContent({
      password,
      did_value,
      did_type: 'nostr' as any,
    });
    const { signature } = this.sign(signContent, privateKey);
    return await Client.register.getMainKeypairBySignature(signature, password);
  }

  // 7. 注册
  async registerToWeb3mq(options: Omit<RegisterBySignParams, 'did_type'>) {
    await Client.register.register({
      ...options,
      didType: 'nostr' as any
    });
  }

  // 8. 登陆
  async loginToWeb3mq(options: Omit<LoginByKeysParams, 'didType'>) {
    return await Client.register.login({
      ...options,
      didType: 'nostr' as any
    });
  }
}