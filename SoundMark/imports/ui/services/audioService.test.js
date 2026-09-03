import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import sinon from "sinon";
import {
  upload,
  getPlayableUrl,
  deleteFile,
  exportAudio
} from "./audioService"; // adjust path to match your file name
if (Meteor.isClient) {
  describe("audio client helpers", function () {
    let callAsyncStub;
    let fetchStub;

    beforeEach(function () {
      callAsyncStub = sinon.stub(Meteor, "callAsync");
      fetchStub = sinon.stub(globalThis, "fetch");
    });

    afterEach(function () {
      sinon.restore();
    });

    describe("upload", function () {
      it("successfully uploads file and returns fileId", async function () {
        const fakeFile = { name: "song.mp3", type: "audio/mpeg" };
        callAsyncStub
          .withArgs("audio.getUploadUrl", "song.mp3", "audio/mpeg")
          .resolves({
            uploadUrl: "https://r2.example.com/upload",
            fileId: "file-123"
          });

        fetchStub.resolves({ ok: true });

        const fileId = await upload(fakeFile);

        assert.equal(fileId, "file-123");
        assert.isTrue(
          fetchStub.calledOnceWith("https://r2.example.com/upload", {
            method: "PUT",
            headers: { "Content-Type": "audio/mpeg" },
            body: fakeFile
          })
        );
      });

      it("throws an error if upload fetch request fails", async function () {
        const fakeFile = { name: "song.mp3", type: "audio/mpeg" };
        callAsyncStub.resolves({
          uploadUrl: "https://r2.example.com/upload",
          fileId: "file-123"
        });

        fetchStub.resolves({ ok: false });

        try {
          await upload(fakeFile);
          assert.fail("Expected upload to throw");
        } catch (err) {
          assert.equal(err.message, "Upload to storage failed");
        }
      });
    });

    describe("getPlayableUrl", function () {
      it("returns download URL from Meteor call", async function () {
        callAsyncStub
          .withArgs("audio.getDownloadUrl", "file-123")
          .resolves("https://r2.example.com/download");

        const url = await getPlayableUrl("file-123");

        assert.equal(url, "https://r2.example.com/download");
      });
    });

    describe("deleteFile", function () {
      it("calls audio.deleteFile with fileId", async function () {
        callAsyncStub.withArgs("audio.deleteFile", "file-123").resolves();

        await deleteFile("file-123");

        assert.isTrue(
          callAsyncStub.calledOnceWith("audio.deleteFile", "file-123")
        );
      });
    });

    describe("exportAudio", function () {
      let createObjectUrlStub;
      let revokeObjectUrlStub;
      let appendChildStub;
      let clickStub;

      beforeEach(function () {
        createObjectUrlStub = sinon
          .stub(URL, "createObjectURL")
          .returns("blob:fake-object-url");
        revokeObjectUrlStub = sinon.stub(URL, "revokeObjectURL");
        appendChildStub = sinon
          .stub(document.body, "appendChild")
          .callsFake((el) => el);
        clickStub = sinon.stub(HTMLAnchorElement.prototype, "click");
      });

      it("fetches audio blob and triggers browser download link", async function () {
        const fakeBlob = new Blob(["audio-data"], { type: "audio/mpeg" });

        callAsyncStub.withArgs("audio.getExportInfo", "file-123").resolves({
          url: "https://r2.example.com/export",
          fileName: "export.mp3"
        });

        fetchStub.resolves({
          ok: true,
          blob: async () => fakeBlob
        });

        const clock = sinon.useFakeTimers();

        try {
          await exportAudio("file-123");

          assert.isTrue(createObjectUrlStub.calledOnceWith(fakeBlob));
          assert.isTrue(appendChildStub.calledOnce);
          assert.isTrue(clickStub.calledOnce);

          const createdLink = appendChildStub.firstCall.args[0];
          assert.equal(createdLink.href, "blob:fake-object-url");
          assert.equal(createdLink.download, "export.mp3");

          clock.tick(1);
          assert.isTrue(
            revokeObjectUrlStub.calledOnceWith("blob:fake-object-url")
          );
        } finally {
          clock.restore();
        }
      });

      it("throws error if export fetch fails", async function () {
        callAsyncStub.resolves({
          url: "https://r2.example.com/export",
          fileName: "export.mp3"
        });

        fetchStub.resolves({ ok: false });

        try {
          await exportAudio("file-123");
          assert.fail("Expected exportAudio to throw");
        } catch (err) {
          assert.equal(err.message, "Could not export the audio");
        }
      });
    });
  });
}
