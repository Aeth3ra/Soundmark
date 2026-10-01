import { Meteor } from "meteor/meteor";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { NotificationProvider } from "../NotificationProvider";
import { AnnotationCard } from "./AnnotationCard";

if (Meteor.isClient) {
  describe("AnnotationCard", function () {
    afterEach(() => { cleanup(); sinon.restore(); });
    it("reports deletion failures without seeking or dropping the annotation", async function () {
      sinon.stub(Meteor, "callAsync").rejects(new Error("Delete failed"));
      sinon.stub(console, "error");
      const onSeek = sinon.spy();
      const { getByTitle, getByRole, getByText } = render(
        <NotificationProvider fileId="f"><AnnotationCard annotation={{ _id: "a", fileId: "f", title: "Verse", start: 1 }} onSeek={onSeek} /></NotificationProvider>
      );
      await act(async () => { fireEvent.click(getByTitle("Delete annotation")); });
      assert.include(getByRole("alert").textContent, "Could not delete");
      assert.exists(getByText("Verse"));
      assert.isFalse(onSeek.called);
    });
    it("shows all analysed region properties", function () {
      render(
        <NotificationProvider><AnnotationCard
          annotation={{
            _id: "annotation-one",
            title: "Verse",
            start: 1,
            end: 6,
            tags: []
          }}
          analysis={{
            duration: 5,
            bpm: 120,
            pitch: "A4 (440 Hz)",
            key: "A minor",
            isAnalysing: false
          }}
          onSeek={() => {}}
        /></NotificationProvider>
      );

      assert.exists(screen.getByText("Duration"));
      assert.exists(screen.getByText("0:05"));
      assert.exists(screen.getByText("BPM"));
      assert.exists(screen.getByText("120"));
      assert.exists(screen.getByText("Pitch"));
      assert.exists(screen.getByText("A4 (440 Hz)"));
      assert.exists(screen.getByText("Key"));
      assert.exists(screen.getByText("A minor"));
    });
  });
}
