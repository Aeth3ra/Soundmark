import { Meteor } from "meteor/meteor";
import { renderHook, act, waitFor } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { useSession } from "./useSession";
import { SessionsCollection } from "../../api/sessions/sessionCollection";

if (Meteor.isClient) {
  describe("useSession", function () {
    const TEST_FILE_ID = "file-123";
    let subscribeStub;

    const cleanupCollection = () => {
      SessionsCollection.find().forEach((doc) => {
        SessionsCollection.remove(doc._id);
      });
    };

    beforeEach(function () {
      cleanupCollection();
      // Stub Meteor.subscribe so useSubscribe resolves loading immediately
      subscribeStub = sinon.stub(Meteor, "subscribe").returns({
        ready: () => true,
        stop: () => {}
      });
    });

    afterEach(function () {
      sinon.restore();
      cleanupCollection();
    });

    it("correctly identifies the host user", function () {
      SessionsCollection.insert({ _id: TEST_FILE_ID, hostId: "host-user-id" });

      const { result } = renderHook(() =>
        useSession({ fileId: TEST_FILE_ID, userId: "host-user-id" })
      );

      assert.isTrue(result.current.isHost);
      assert.isFalse(result.current.sessionEnded);
    });

    it("evaluates isHost as false for non-host participants", function () {
      SessionsCollection.insert({ _id: TEST_FILE_ID, hostId: "host-user-id" });

      const { result } = renderHook(() =>
        useSession({ fileId: TEST_FILE_ID, userId: "guest-user-id" })
      );

      assert.isFalse(result.current.isHost);
    });

    it("flags sessionEnded when an active session disappears", async function () {
      SessionsCollection.insert({ _id: TEST_FILE_ID, hostId: "host-user-id" });

      const { result } = renderHook(() =>
        useSession({ fileId: TEST_FILE_ID, userId: "guest-user-id" })
      );

      assert.isFalse(result.current.sessionEnded);

      act(() => {
        SessionsCollection.remove(TEST_FILE_ID);
      });

      await waitFor(() => {
        assert.isTrue(result.current.sessionEnded);
      });
    });
  });
}
