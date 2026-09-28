import React from "react";
import { Meteor } from "meteor/meteor";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { EffectCard } from "./EffectCard";

if (Meteor.isClient) {
	describe("EffectCard local playback switch", function () {
		const effect = {
			_id: "effect-1",
			createdBy: "collaborator",
			type: "amplify",
			params: { gainDb: 6 },
			start: 1,
			end: 2,
			enabled: true
		};

		afterEach(cleanup);

		it("lets a listener toggle an active collaborator effect locally", function () {
			const onToggleLocalEffect = sinon.spy();
			const props = {
				effect,
				onSeek: sinon.spy(),
				userId: "listener",
				isHost: false,
				locallyMuted: false,
				onToggleLocalEffect,
				creatorName: "Alex"
			};
			const { getByRole, queryByText, rerender } = render(
				<EffectCard {...props} />
			);
			const toggle = getByRole("switch", {
				name: "Play Region amplification by Alex in my playback"
			});
			assert.equal(toggle.getAttribute("aria-checked"), "true");
			assert.isNull(queryByText("Disable for everyone"));

			fireEvent.click(toggle);
			assert.isTrue(onToggleLocalEffect.calledOnceWithExactly("effect-1"));

			rerender(<EffectCard {...props} locallyMuted />);
			assert.equal(getByRole("switch").getAttribute("aria-checked"), "false");
		});

		it("does not offer local playback toggles for own or shared-disabled effects", function () {
			const props = {
				effect,
				onSeek: sinon.spy(),
				userId: "collaborator",
				isHost: false,
				locallyMuted: false,
				onToggleLocalEffect: sinon.spy()
			};
			const { queryByRole, rerender } = render(<EffectCard {...props} />);
			assert.isNull(queryByRole("switch"));

			rerender(
				<EffectCard
					{...props}
					userId="listener"
					effect={{ ...effect, enabled: false }}
				/>
			);
			assert.isNull(queryByRole("switch"));
		});
	});
}
