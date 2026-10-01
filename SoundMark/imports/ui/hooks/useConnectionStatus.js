import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";

export const useConnectionStatus = () => useTracker(() => Meteor.status().connected, []);
