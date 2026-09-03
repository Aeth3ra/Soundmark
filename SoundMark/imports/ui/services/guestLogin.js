import { Accounts } from "meteor/accounts-base";

// Client-side trigger for the "guest" login handler registered on the server.
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
