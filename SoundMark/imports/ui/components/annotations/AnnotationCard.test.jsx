import { Meteor } from "meteor/meteor";
import { render, screen } from "@testing-library/react";
import { assert } from "chai";
import { AnnotationCard } from "./AnnotationCard";

if (Meteor.isClient) {
  describe("AnnotationCard", function () {
    it("shows all analysed region properties", function () {
      render(
        <AnnotationCard
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
        />
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
