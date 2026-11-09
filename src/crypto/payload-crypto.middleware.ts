import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CryptoService } from './crypto.service';

@Injectable()
export class PayloadCryptoMiddleware implements NestMiddleware {
  constructor(private readonly cryptoService: CryptoService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const isEncryptedHeader = req.headers['x-payload-encrypted'] === 'true';

    if (req.body && req.body.encryptedData) {
      if (typeof req.body.encryptedData === 'string') {
        req.body = this.cryptoService.decrypt(req.body.encryptedData);
      } else if (typeof req.body.encryptedData === 'object') {
        req.body = req.body.encryptedData;
      }
      (req as any).isEncryptedPayload = true;
    } else if (isEncryptedHeader && typeof req.body === 'string') {
      req.body = this.cryptoService.decrypt(req.body);
      (req as any).isEncryptedPayload = true;
    }

    next();
  }
}
