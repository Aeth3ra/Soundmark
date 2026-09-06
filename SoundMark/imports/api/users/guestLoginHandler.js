import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";

// Registers a custom "guest" login type on top of plain accounts-base.
// Accounts.callLoginMethod on the client triggers this
Accounts.registerLoginHandler("guest", async (options) => {
  if (!options.guest) return undefined; // not a guest login attempt - let other handlers take it

  const userId = await Meteor.users.insertAsync({
    createdAt: new Date(),
    guest: true // flags this as a guest account, useful for future cleanup/filtering
  });

  const stampedToken = Accounts._generateStampedLoginToken();
  await Accounts._insertLoginToken(userId, stampedToken);

  return { userId, token: stampedToken.token };
});
