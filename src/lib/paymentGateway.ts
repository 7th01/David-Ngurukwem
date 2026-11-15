export type PaymentGatewayProvider = 'paystack' | 'flutterwave' | 'development';

export interface PaymentGatewayConfig {
  paymentEnabled: boolean;
  paymentMode: 'development' | 'live';
  paystackEnabled: boolean;
  flutterwaveEnabled: boolean;
  enforcePlanLimits: boolean;
}

export interface ServerGatewayEnvStatus {
  hasPaystackSecret: boolean;
  hasFlutterwaveSecret: boolean;
}

export const DEFAULT_PAYMENT_CONFIG: PaymentGatewayConfig = {
  paymentEnabled: true,
  paymentMode: 'development',
  paystackEnabled: true,
  flutterwaveEnabled: true,
  enforcePlanLimits: false,
};

export interface GatewayInitResult {
  reference: string;
  gateway: PaymentGatewayProvider;
  mode: 'development' | 'live';
}

export interface GatewayVerifyResult {
  verified: boolean;
  reason?: string;
  mode: 'development' | 'live';
}

/**
 * Reports whether optional live payment credentials exist on the server.
 * Never exposes secret values or requires them during development.
 */
export function getServerGatewayEnvStatus(): ServerGatewayEnvStatus {
  return {
    hasPaystackSecret: Boolean(process.env.PAYSTACK_SECRET_KEY),
    hasFlutterwaveSecret: Boolean(process.env.FLUTTERWAVE_SECRET_KEY),
  };
}

export function initializeModularPayment(
  requestedGateway: 'paystack' | 'flutterwave',
  config: PaymentGatewayConfig = DEFAULT_PAYMENT_CONFIG
): GatewayInitResult {
  if (!config.paymentEnabled) {
    throw new Error(
      'Payment checkout is currently disabled by the Statedge administrator. Core analytics features remain fully accessible.'
    );
  }

  if (requestedGateway === 'paystack' && !config.paystackEnabled) {
    throw new Error('Paystack checkout is currently disabled by the administrator.');
  }

  if (requestedGateway === 'flutterwave' && !config.flutterwaveEnabled) {
    throw new Error('Flutterwave checkout is currently disabled by the administrator.');
  }

  const isLive = config.paymentMode === 'live';
  if (isLive) {
    if (requestedGateway === 'paystack' && !process.env.PAYSTACK_SECRET_KEY) {
      throw new Error(
        'Live Paystack mode is enabled, but server PAYSTACK_SECRET_KEY is not configured. Switch to Development Payment Mode in Admin Config to test without credentials.'
      );
    }
    if (requestedGateway === 'flutterwave' && !process.env.FLUTTERWAVE_SECRET_KEY) {
      throw new Error(
        'Live Flutterwave mode is enabled, but server FLUTTERWAVE_SECRET_KEY is not configured. Switch to Development Payment Mode in Admin Config to test without credentials.'
      );
    }
  }

  const prefix = requestedGateway === 'flutterwave' ? 'FLW' : 'PSK';
  const reference = `SE-${isLive ? prefix : 'DEV'}-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  return {
    reference,
    gateway: requestedGateway,
    mode: isLive ? 'live' : 'development',
  };
}

export async function verifyModularPayment(params: {
  reference: string;
  gateway: string;
  expectedAmountNgn: number;
  confirmationCode?: string;
  config?: PaymentGatewayConfig;
}): Promise<GatewayVerifyResult> {
  const {
    reference,
    gateway,
    expectedAmountNgn,
    confirmationCode,
    config = DEFAULT_PAYMENT_CONFIG,
  } = params;

  if (!config.paymentEnabled) {
    return {
      verified: false,
      mode: config.paymentMode,
      reason: 'Payment checkout is currently disabled by the administrator.',
    };
  }

  if (config.paymentMode !== 'live') {
    // Development payment mode: does not require external credentials or fake keys,
    // while still enforcing explicit confirmation matching the reference suffix.
    const expectedCode = reference.slice(-4);
    if (!confirmationCode || confirmationCode.trim() !== expectedCode) {
      return {
        verified: false,
        mode: 'development',
        reason: `Development confirmation requires the 4-digit code "${expectedCode}".`,
      };
    }
    return { verified: true, mode: 'development' };
  }

  if (gateway === 'paystack' && process.env.PAYSTACK_SECRET_KEY) {
    const resp = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    const json = (await resp.json()) as {
      status?: boolean;
      data?: { status?: string; amount?: number };
    };
    if (
      json?.status &&
      json?.data?.status === 'success' &&
      json.data.amount === expectedAmountNgn * 100
    ) {
      return { verified: true, mode: 'live' };
    }
    return {
      verified: false,
      mode: 'live',
      reason: 'Paystack verification did not return a successful matching transaction.',
    };
  }

  if (gateway === 'flutterwave' && process.env.FLUTTERWAVE_SECRET_KEY) {
    const resp = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(
        reference
      )}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );
    const json = (await resp.json()) as {
      status?: string;
      data?: { status?: string; amount?: number };
    };
    if (
      json?.status === 'success' &&
      json?.data?.status === 'successful' &&
      json.data.amount === expectedAmountNgn
    ) {
      return { verified: true, mode: 'live' };
    }
    return {
      verified: false,
      mode: 'live',
      reason: 'Flutterwave verification did not return a successful matching transaction.',
    };
  }

  return {
    verified: false,
    mode: 'live',
    reason: 'Live payment mode is active, but the selected gateway server secret is not configured.',
  };
}
