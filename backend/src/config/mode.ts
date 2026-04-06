/**
 * SIMULATION_MODE — when true, no real Bitso API calls are made and
 * blockchain transactions are mocked. Safe for local dev and demos.
 *
 * Evaluated lazily so dotenv.config() in index.ts has already run
 * before this getter is called at request-time.
 */
export const SIMULATION_MODE = () => process.env.SIMULATION_MODE === 'true';
