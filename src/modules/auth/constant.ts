/**
 * Cookie names and options for the auth tokens.
 *
 * The options are getters on purpose. Reading process.env at module load time
 * is what made the JWT secrets fall back to hardcoded defaults: this file is
 * evaluated while AppModule's imports are being resolved, which is before
 * ConfigModule.forRoot() has loaded .env. Evaluating per access means the
 * value is read when a request is served, by which point the env is populated.
 *
 * JWT secrets and lifetimes are deliberately absent. They are read through
 * ConfigService with getOrThrow so a missing secret stops the process instead
 * of silently signing tokens with a guessable default.
 */
const secureCookies = () => process.env.NODE_ENV === 'production';

export const cookieConstants = {
  accessTokenName: 'access_token',
  refreshTokenName: 'refresh_token',

  get accessTokenOptions() {
    return {
      httpOnly: true,
      secure: secureCookies(),
      sameSite: 'strict' as const,
      maxAge: 5 * 60 * 1000, // 5m in milliseconds
    };
  },

  get refreshTokenOptions() {
    return {
      httpOnly: true,
      secure: secureCookies(),
      sameSite: 'strict' as const,
      maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days in milliseconds
    };
  },
};
