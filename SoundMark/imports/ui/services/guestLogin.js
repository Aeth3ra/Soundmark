import { Accounts } from "meteor/accounts-base";

/**
 * Authenticates the client anonymously using the custom "guest" login handler.
 *
 * @returns {Promise<void>} Resolves when the session token is received and user state is initialized.
 */
export function loginAsGuest() {
  return new Promise((resolve, reject) => {
    Accounts.callLoginMethod({
      methodArguments: [{ guest: true }],
      userCallback: (err) => {
        if (err) reject(err);
        else resolve();
      }
    });
  });
}
