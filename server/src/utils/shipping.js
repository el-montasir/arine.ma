/**
 * Re-exports shipping calculation constants and functions from the central
 * shipping service abstraction.
 */
export {
  calcShipping,
  getShippingBreakdown,
  DEFAULT_FREE_SHIPPING_THRESHOLD as FREE_SHIPPING_THRESHOLD,
  DEFAULT_FLAT_SHIPPING_FEE as FLAT_SHIPPING_FEE,
} from '../services/shipping/index.js'
