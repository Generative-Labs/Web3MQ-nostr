import Web3 from 'web3';
import noble from 'noble-secp256k1';
import { SimplePool, Event, getEventHash, signEvent, nip04 } from 'nostr-tools';
import { Client } from '../client';
import { 
  GetMainKeypairByNostrParams, 
  GetRegisterSignContentParams,
  LoginByKeysParams,
  NostrOptions, 
  RegisterBySignParams 
} from '../types';

import { ByteArrayToHexString } from '../utils';

export class Nostr {
  private web3: Web3;
  relays: Array<string>;
  appKey: string;
  relayPool: any | null;

  constructor(options: NostrOptions) {
    this.appKey = options.appKey;
    this.relays = options.relays;
    this.web3 = new Web3(Web3.givenProvider);
    
    this.init(options.relays);
  }

  private init(relays: Array<string>) {
    const pool = new SimplePool();
    relays.forEach(async(relay) => {
      const r = await pool.ensureRelay(relay);
      r.on('connect', () => {
        console.log(`${r.url} connect successful`);
      });
      r.on('notice', (...arg: any[]) => {
        console.log('notice', arg);
      });
    });
    this.relayPool = pool;
  }

  getEventHash(event: Event) {
    return getEventHash(event);
  }

  signEvent(event: Event, key: string) {
    return signEvent(event, key);
  }
  async encrypt(senderPrivateKey: string, receiverPublicKey: string, message: string) {
    return await nip04.encrypt(senderPrivateKey, receiverPublicKey, message);
  }
  async decrypt(privateKey: string, publicKey: string, content: string) {
    return await nip04.decrypt(privateKey, publicKey, content);
  }

  // 1. 生成nostr的密钥对（账户）
  generateNostrKeyPair() {
    const privObject = noble.utils.randomPrivateKey();
    // Schnorr signatures
    const pubObject = noble.schnorr.getPublicKey(privObject);
    const privKey = ByteArrayToHexString(privObject);
    const pubKey = ByteArrayToHexString(pubObject);
    return {
      PrivateKey: privKey,
      PublicKey: pubKey,
    };
  }

  // 2. 通过公钥生成address
  generateAddress(PrivateKey: string) {
    const { address } = this.web3.eth.accounts.privateKeyToAccount(`0x${PrivateKey}`);
    return {
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