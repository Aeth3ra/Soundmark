import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { AudioCollection } from "../imports/api/audio/audioCollection";
import { AnnotationsCollection } from "../imports/api/annotations/annotationsCollection";
import "/imports/api/audio/audioMethods";
import "/imports/api/annotations/annotationsMethods";
import "/imports/api/annotations/annotationsPublications";

Meteor.startup(async () => {});

Meteor.methods({
  about() {
    return `This is a Meteor application running React with React Router. this is a generated id: ${Random.id()}`;
  }
});
