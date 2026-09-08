import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import JSZip from "jszip";
import {
  buildProjectPackage,
  parseProjectPackage,
  toPortableAnnotations,
  ProjectPackageError,
  PACKAGE_VERSION
} from "./projectPackage";

if (Meteor.isClient) {
  describe("projectPackage", function () {
    const annotations = [
      {
        _id: "ann1",
        fileId: "file1",
        createdBy: "user1",
        title: "Intro",
        colour: "#64748b",
        start: 1.5,
        end: 3.2,
        tags: ["structure"],
        comment: "nice hook"
      },
      {
        _id: "ann2",
        fileId: "file1",
        createdBy: "user1",
        title: "Bridge",
        colour: "#ef4444",
        start: 10,
        end: null,
        tags: [],
        comment: ""
      }
    ];

    describe("toPortableAnnotations", function () {
      it("strips database-only fields", function () {
        const portable = toPortableAnnotations(annotations);
        assert.isUndefined(portable[0]._id);
        assert.isUndefined(portable[0].fileId);
        assert.isUndefined(portable[0].createdBy);
        assert.equal(portable[0].title, "Intro");
      });
    });

    describe("buildProjectPackage / parseProjectPackage round trip", function () {
      it("restores the same audio bytes, filename and annotations", async function () {
        const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4, 5])], {
          type: "audio/wav"
        });

        const packageBlob = await buildProjectPackage({
          fileName: "song.wav",
          contentType: "audio/wav",
          audioBlob,
          annotations
        });

        const result = await parseProjectPackage(packageBlob);

        assert.equal(result.fileName, "song.wav");
        assert.equal(result.contentType, "audio/wav");
        assert.equal(result.annotations.length, 2);
        assert.equal(result.annotations[0].title, "Intro");
        assert.isUndefined(result.annotations[0]._id);
        assert.isNull(result.annotations[1].end);

        const bytes = new Uint8Array(await result.audioBlob.arrayBuffer());
        assert.deepEqual(Array.from(bytes), [1, 2, 3, 4, 5]);
      });
    });

    describe("parseProjectPackage validation", function () {
      it("rejects a file that isn't a zip at all", async function () {
        try {
          await parseProjectPackage(new Blob(["not a zip"]));
          assert.fail("expected parseProjectPackage to throw");
        } catch (err) {
          assert.instanceOf(err, ProjectPackageError);
        }
      });

      it("rejects a zip missing manifest.json or annotations.json", async function () {
        const zip = new JSZip();
        zip.file("annotations.json", "[]");
        const blob = await zip.generateAsync({ type: "blob" });

        try {
          await parseProjectPackage(blob);
          assert.fail("expected parseProjectPackage to throw");
        } catch (err) {
          assert.instanceOf(err, ProjectPackageError);
        }
      });

      it("rejects an incompatible package version", async function () {
        const zip = new JSZip();
        zip.file(
          "manifest.json",
          JSON.stringify({
            version: PACKAGE_VERSION + 1,
            fileName: "song.wav",
            contentType: "audio/wav",
            audioPath: "audio/song.wav"
          })
        );
        zip.file("annotations.json", "[]");
        zip.file("audio/song.wav", new Blob(["x"]));
        const blob = await zip.generateAsync({ type: "blob" });

        try {
          await parseProjectPackage(blob);
          assert.fail("expected parseProjectPackage to throw");
        } catch (err) {
          assert.instanceOf(err, ProjectPackageError);
          assert.match(err.message, /incompatible version/i);
        }
      });

      it("rejects malformed annotation entries", async function () {
        const zip = new JSZip();
        zip.file(
          "manifest.json",
          JSON.stringify({
            version: PACKAGE_VERSION,
            fileName: "song.wav",
            contentType: "audio/wav",
            audioPath: "audio/song.wav"
          })
        );
        zip.file("annotations.json", JSON.stringify([{ title: "missing start" }]));
        zip.file("audio/song.wav", new Blob(["x"]));
        const blob = await zip.generateAsync({ type: "blob" });

        try {
          await parseProjectPackage(blob);
          assert.fail("expected parseProjectPackage to throw");
        } catch (err) {
          assert.instanceOf(err, ProjectPackageError);
        }
      });

      it("rejects a manifest pointing at a missing audio entry", async function () {
        const zip = new JSZip();
        zip.file(
          "manifest.json",
          JSON.stringify({
            version: PACKAGE_VERSION,
            fileName: "song.wav",
            contentType: "audio/wav",
            audioPath: "audio/missing.wav"
          })
        );
        zip.file("annotations.json", "[]");
        const blob = await zip.generateAsync({ type: "blob" });

        try {
          await parseProjectPackage(blob);
          assert.fail("expected parseProjectPackage to throw");
        } catch (err) {
          assert.instanceOf(err, ProjectPackageError);
        }
      });
    });
  });
}
