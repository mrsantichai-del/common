import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CryptoModule } from './crypto/crypto.module';
import { AdminModule } from './admin/admin.module';
import { MasterTableModule } from './master-table/master-table.module';
import { OrganizationModule } from './organization/organization.module';
import { PayloadCryptoMiddleware } from './crypto/payload-crypto.middleware';
import { PayloadCryptoInterceptor } from './crypto/payload-crypto.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CryptoModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    MasterTableModule,
    OrganizationModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: PayloadCryptoInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PayloadCryptoMiddleware).forRoutes('*');
  }
}
