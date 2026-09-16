import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { AudioCollection } from "../imports/api/audio/audioCollection";
import { AnnotationsCollection } from "../imports/api/annotations/annotationsCollection";
import { PresenceCollection } from "/imports/api/presences/presenceCollection";
import { SessionsCollection } from "/imports/api/sessions/sessionCollection";
import "/imports/api/audio/audioMethods";
import "/imports/api/annotations/annotationsMethods";
import "/imports/api/annotations/annotationsPublications";
import "/imports/api/users/guestLoginHandler";
import "/imports/api/users/userMethods";
import "/imports/api/presences/presenceMethods";
import "/imports/api/presences/presencePublications";
import "/imports/api/sessions/sessionPublications";
import "/imports/api/effects/effectsMethods";
import "/imports/api/effects/effectsPublications";

Meteor.startup(async () => {});

Meteor.methods({
  about() {
    return `This is a Meteor application running React with React Router. this is a generated id: ${Random.id()}`;
  }
});
