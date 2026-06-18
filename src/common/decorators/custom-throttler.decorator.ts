// //Custom throttler config

// import { Throttle } from '@nestjs/throttler';

// //Strict rate of auth, payments
// export const StrictThrottle = () => {
//   Throttle({
//     default: {
//       ttl: 1000,
//       limit: 3,
//     },
//   });
// };

// //Moderate rate for orders
// export const ModerateThrottle = () => {
//   Throttle({
//     default: {
//       ttl: 1000,
//       limit: 5,
//     },
//   });
// };

// //Relaxed Rate for read operations
// export const RelaxedThrottle = () => {
//   Throttle({
//     default: {
//       ttl: 1000,
//       limit: 20,
//     },
//   });
// };


// custom-throttler.decorator.ts
import { Throttle } from '@nestjs/throttler';

// Strict rate of auth, payments
export const StrictThrottle = () => Throttle({
  default: {
    ttl: 1000,
    limit: 3,
  },
});

// Moderate rate for orders
export const ModerateThrottle = () => Throttle({
  default: {
    ttl: 1000,
    limit: 5,
  },
});

// Relaxed Rate for read operations
export const RelaxedThrottle = () => Throttle({
  default: {
    ttl: 1000,
    limit: 20,
  },
});