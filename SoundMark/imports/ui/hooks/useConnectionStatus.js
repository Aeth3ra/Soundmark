import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";

/**
 * Reactively monitors the DDP connection status with the Meteor server.
 *
 * @returns {boolean} True if the socket is currently connected.
 */
export const useConnectionStatus = () => useTracker(() => Meteor.status().connected, []);
