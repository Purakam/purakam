import { createPaymentOrder, verifyPayment } from '../api/bookings/bookingsApi';

/**
 * Runs the full online-payment flow for an existing booking:
 *   1. asks our backend to create a Razorpay order (the backend decides the
 *      amount - the app never sends one),
 *   2. opens Razorpay's native checkout with that order,
 *   3. sends the result back to our backend, which verifies Razorpay's
 *      signature before marking the booking paid.
 *
 * Never throws for the "normal" ways a payment can end - it resolves to
 * { success: true } or { success: false, cancelled, message } so callers can
 * show the right message. Only unexpected programming errors propagate.
 */
export async function payForBooking(booking, user) {
  let order;
  try {
    order = await createPaymentOrder(booking.id);
  } catch (error) {
    const detail = error?.response?.data?.detail;
    return {
      success: false,
      cancelled: false,
      message: typeof detail === 'string' ? detail : 'Could not start the payment. Please try again.',
    };
  }

  // Local development without real Razorpay keys: the backend hands out a
  // mock order (and only ever does so outside production). There is nothing
  // for the native checkout to open in that case, so confirm it directly -
  // the backend's matching mock verification accepts it. This also lets the
  // whole booking flow be exercised in Expo Go before a dev build exists.
  if (typeof order.order_id === 'string' && order.order_id.startsWith('order_mock_')) {
    try {
      await verifyPayment(booking.id, {
        razorpay_order_id: order.order_id,
        razorpay_payment_id: `pay_mock_${booking.id}`,
        razorpay_signature: 'mock_signature',
      });
      return { success: true };
    } catch (error) {
      const detail = error?.response?.data?.detail;
      return {
        success: false,
        cancelled: false,
        message: typeof detail === 'string' ? detail : 'Payment could not be confirmed.',
      };
    }
  }

  // Loaded here rather than at the top of the file so that the rest of the app
  // still starts in Expo Go, where this native module doesn't exist - only an
  // attempt to pay for real needs it.
  let RazorpayCheckout;
  try {
    RazorpayCheckout = require('react-native-razorpay').default;
    if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
      throw new Error('Razorpay native module unavailable');
    }
  } catch (error) {
    return {
      success: false,
      cancelled: false,
      message: 'Online payment needs the Purakam app build with payments enabled. Please use the installed app, not Expo Go.',
    };
  }

  let paymentData;
  try {
    paymentData = await RazorpayCheckout.open({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount, // already in paise, as computed by the backend
      currency: 'INR',
      name: 'Purakam',
      description: `${booking.service_category} Service Booking #${booking.id}`,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: { color: '#22C55E' },
    });
  } catch (error) {
    // Razorpay rejects with { code, description } for both a customer
    // dismissing the sheet and a genuine failure (declined card, network).
    const description = error?.description || error?.error?.description || '';
    const cancelled = /cancel/i.test(description) || error?.code === 0;
    return {
      success: false,
      cancelled,
      message: cancelled ? 'Payment was cancelled.' : description || 'Payment failed. Please try again.',
    };
  }

  try {
    await verifyPayment(booking.id, {
      razorpay_payment_id: paymentData.razorpay_payment_id,
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_signature: paymentData.razorpay_signature,
    });
    return { success: true };
  } catch (error) {
    // The customer was charged but our confirmation call failed. The backend's
    // Razorpay webhook records the payment independently, so this is usually
    // resolved on its own - tell the person that instead of "payment failed".
    return {
      success: false,
      cancelled: false,
      charged: true,
      message: 'Your payment went through but we could not confirm it yet. It will update shortly - please check My Bookings.',
    };
  }
}