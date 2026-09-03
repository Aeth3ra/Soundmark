import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import sinon from "sinon";
import { deleteAnnotation, createAnnotation } from "./annotationService";
if (Meteor.isClient) {
  describe("annotation client helpers", function () {
    let callAsyncStub;
    let consoleErrorStub;

    beforeEach(function () {
      callAsyncStub = sinon.stub(Meteor, "callAsync");
      consoleErrorStub = sinon.stub(console, "error");
    });

    afterEach(function () {
      sinon.restore();
    });

    describe("deleteAnnotation", function () {
      it("calls annotations.delete with annotation._id", async function () {
        callAsyncStub.resolves();
        const fakeAnnotation = { _id: "ann-123" };

        await deleteAnnotation(fakeAnnotation);

        assert.isTrue(
          callAsyncStub.calledOnceWith("annotations.delete", "ann-123")
        );
      });

      it("logs an error if Meteor.callAsync throws synchronously", async function () {
        const fakeError = new Error("Network error");
        callAsyncStub.throws(fakeError);

        await deleteAnnotation({ _id: "ann-123" });

        assert.isTrue(
          consoleErrorStub.calledOnceWith(
            "Couldn't delete annotation",
            fakeError
          )
        );
      });
    });

    describe("createAnnotation", function () {
      it("trims the title and passes formatted payload to annotations.create", async function () {
        callAsyncStub.resolves();
        const params = {
          fileId: "file-123",
          title: "  Chorus Marker  ",
          colour: "#ff0000",
          start: 12.5,
          end: 25.0,
          tags: ["vocal", "chorus"],
          comment: "Check lead vocals here"
        };

        await createAnnotation(params);

        assert.isTrue(
          callAsyncStub.calledOnceWith("annotations.create", {
            fileId: "file-123",
            title: "Chorus Marker",
            colour: "#ff0000",
            start: 12.5,
            end: 25.0,
            tags: ["vocal", "chorus"],
            comment: "Check lead vocals here"
          })
        );
      });

      it("logs an error when Meteor.callAsync rejects", async function () {
        const fakeError = new Error("Database insert failed");
        callAsyncStub.rejects(fakeError);

        await createAnnotation({
          fileId: "file-123",
          title: "Test",
          colour: "#000",
          start: 0,
          end: 5,
          tags: [],
          comment: ""
        });

        assert.isTrue(
          consoleErrorStub.calledOnceWith(
            "Couldn't create annotation",
            fakeError
          )
        );
      });
    });
  });
}
