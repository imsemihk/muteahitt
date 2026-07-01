import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Iyzipay = require('iyzipay');

export interface IyzicoPaymentRequest {
  price: string;
  paidPrice: string;
  currency: string;
  installment: string;
  paymentChannel: string;
  paymentGroup: string;
  callbackUrl: string;
  conversationId: string;
  buyer: {
    id: string;
    name: string;
    surname: string;
    email: string;
    identityNumber: string;
    registrationAddress: string;
    city: string;
    country: string;
    ip: string;
  };
  shippingAddress: { contactName: string; city: string; country: string; address: string };
  billingAddress: { contactName: string; city: string; country: string; address: string };
  basketItems: Array<{
    id: string;
    name: string;
    category1: string;
    itemType: string;
    price: string;
  }>;
}

export interface IyzicoResult {
  status: 'success' | 'failure';
  paymentId?: string;
  conversationId?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

@Injectable()
export class IyzicoService {
  private readonly logger = new Logger(IyzicoService.name);
  private readonly client: Iyzipay;

  constructor(private readonly config: ConfigService) {
    this.client = new Iyzipay({
      apiKey: config.getOrThrow('IYZICO_API_KEY'),
      secretKey: config.getOrThrow('IYZICO_SECRET_KEY'),
      uri: config.get('IYZICO_BASE_URL') ?? 'https://sandbox-api.iyzipay.com',
    });
  }

  // 3DS başlat — frontend'e checkoutFormContent döner
  async initializeCheckout(request: IyzicoPaymentRequest): Promise<{
    checkoutFormContent: string;
    token: string;
  }> {
    return new Promise((resolve, reject) => {
      this.client.checkoutFormInitialize.create(request, (err: unknown, result: any) => {
        if (err) return reject(err);
        if (result.status !== 'success') {
          this.logger.warn(`Iyzico init hatası: ${result.errorMessage}`);
          return reject(new Error(result.errorMessage ?? 'Ödeme başlatılamadı'));
        }
        resolve({
          checkoutFormContent: result.checkoutFormContent,
          token: result.token,
        });
      });
    });
  }

  // 3DS callback sonrası token ile sonucu doğrula
  async retrieveCheckoutForm(token: string): Promise<IyzicoResult> {
    return new Promise((resolve) => {
      this.client.checkoutForm.retrieve({ token }, (err: unknown, result: any) => {
        if (err) {
          this.logger.error('Iyzico retrieve hatası', err);
          return resolve({ status: 'failure', errorMessage: 'Ödeme doğrulanamadı' });
        }

        if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
          return resolve({
            status: 'failure',
            errorCode: result.errorCode,
            errorMessage: result.errorMessage ?? 'Ödeme başarısız',
            rawResponse: result,
          });
        }

        resolve({
          status: 'success',
          paymentId: result.paymentId,
          conversationId: result.conversationId,
          rawResponse: result,
        });
      });
    });
  }
}
