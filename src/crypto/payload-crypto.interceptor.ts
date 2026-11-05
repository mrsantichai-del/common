import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CryptoService } from './crypto.service';

@Injectable()
export class PayloadCryptoInterceptor implements NestInterceptor {
  constructor(private readonly cryptoService: CryptoService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const isEncrypted =
      request.headers['x-payload-encrypted'] === 'true' ||
      Boolean((request as any).isEncryptedPayload);

    return next.handle().pipe(
      map((data) => {
        if (!isEncrypted || data === undefined || data === null) {
          return data;
        }

        const ciphertext = this.cryptoService.encrypt(data);
        return {
          encryptedData: ciphertext,
          isEncrypted: true,
        };
      }),
    );
  }
}
