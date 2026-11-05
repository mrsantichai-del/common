import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class CryptoService {
  private readonly secretKey: string;

  constructor(configService: ConfigService) {
    this.secretKey = configService.get<string>(
      'PAYLOAD_SECRET_KEY',
      'aes-shared-payload-key-secret-2026-v1',
    );
  }

  encrypt(data: any): string {
    const rawText = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(rawText, this.secretKey).toString();
  }

  decrypt(ciphertext: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.secretKey);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedText) {
        throw new BadRequestException('Decryption failed: Invalid ciphertext or mismatched key');
      }
      try {
        return JSON.parse(decryptedText);
      } catch {
        return decryptedText;
      }
    } catch (e) {
      throw new BadRequestException('Unable to decrypt incoming payload');
    }
  }
}
